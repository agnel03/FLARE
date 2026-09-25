#!/usr/bin/env bash
# Black-box adversarial authorization test against a LIVE running API +
# Postgres instance (start with `pnpm --filter @flare/api dev` first).
# Complements — does not replace — the Jest integration suite in
# apps/api/test/*.spec.ts, which runs in CI without a manually-started
# server. This script is the literal test-matrix table from
# docs/PERMISSION_MATRIX.md, executable rather than just documented.
# Registers fresh throwaway accounts on every run, so it's safe to re-run.
set -e
BASE="${FLARE_API_BASE:-http://localhost:4000/v1}"
PASS=0
FAIL=0

jget() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)"; }

check() {
  local desc="$1" expect="$2" actual="$3"
  if [ "$expect" = "$actual" ]; then
    PASS=$((PASS+1)); echo "PASS  $desc  (got $actual)"
  else
    FAIL=$((FAIL+1)); echo "FAIL  $desc  (expected $expect, got $actual)"
  fi
}

# outcome of a curl JSON response: "ALLOW" if no .error, "DENY" if error.code == FORBIDDEN
outcome() {
  python3 -c "
import sys,json
d=json.load(sys.stdin)
print('DENY' if 'error' in d and d['error']['code']=='FORBIDDEN' else ('ALLOW' if 'error' not in d else 'ERROR:'+d['error']['code']))
"
}

RUN_ID="$(date +%s)-$$"

reg() {
  curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1-$RUN_ID@test.flare\",\"password\":\"password123\",\"displayName\":\"$2\"}"
}

echo "== registering test accounts (run id: $RUN_ID) =="
OWNER=$(reg pm-owner "PM Owner")
SCORER=$(reg pm-scorer "PM Scorer")
OFFICIAL=$(reg pm-official "PM Official")
ORGANIZER=$(reg pm-organizer "PM Organizer")
TEAMMGR=$(reg pm-teammgr "PM TeamMgr")
STRANGER=$(reg pm-stranger "PM Stranger")

OWNER_T=$(echo "$OWNER" | jget "['data']['accessToken']")
SCORER_T=$(echo "$SCORER" | jget "['data']['accessToken']")
OFFICIAL_T=$(echo "$OFFICIAL" | jget "['data']['accessToken']")
ORGANIZER_T=$(echo "$ORGANIZER" | jget "['data']['accessToken']")
TEAMMGR_T=$(echo "$TEAMMGR" | jget "['data']['accessToken']")
STRANGER_T=$(echo "$STRANGER" | jget "['data']['accessToken']")

OWNER_PLAYER=$(curl -s $BASE/me -H "Authorization: Bearer $OWNER_T" | jget "['data']['player']['id']")
OFFICIAL_PLAYER=$(curl -s $BASE/me -H "Authorization: Bearer $OFFICIAL_T" | jget "['data']['player']['id']")
TEAMMGR_PLAYER=$(curl -s $BASE/me -H "Authorization: Bearer $TEAMMGR_T" | jget "['data']['player']['id']")
SCORER_ACCOUNT=$(curl -s $BASE/me -H "Authorization: Bearer $SCORER_T" | jget "['data']['accountId']")

echo "== owner creates T1/T2/M1 =="
T1=$(curl -s -X POST $BASE/teams -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"name":"PM Home"}' | jget "['data']['id']")
T2=$(curl -s -X POST $BASE/teams -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"name":"PM Away"}' | jget "['data']['id']")
M1=$(curl -s -X POST $BASE/matches -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d "{\"homeTeamId\":\"$T1\",\"awayTeamId\":\"$T2\"}" | jget "['data']['id']")
echo "M1=$M1 T1=$T1 T2=$T2"

echo "== owner delegates SCORER/OFFICIAL/ORGANIZER, adds team manager =="
curl -s -X POST $BASE/matches/$M1/operators -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"email":"pm-scorer-'"$RUN_ID"'@test.flare","role":"SCORER"}' > /dev/null
curl -s -X POST $BASE/matches/$M1/operators -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"email":"pm-official-'"$RUN_ID"'@test.flare","role":"OFFICIAL"}' > /dev/null
curl -s -X POST $BASE/matches/$M1/operators -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"email":"pm-organizer-'"$RUN_ID"'@test.flare","role":"ORGANIZER"}' > /dev/null
curl -s -X POST $BASE/teams/$T1/members -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d "{\"playerId\":\"$TEAMMGR_PLAYER\",\"role\":\"MANAGER\"}" > /dev/null

echo ""
echo "=== LIFECYCLE PERMISSION TESTS (match still SCHEDULED) ==="
R=$(curl -s -X POST $BASE/matches/$M1/start -H "Authorization: Bearer $SCORER_T"); check "SCORER cannot start match" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/start -H "Authorization: Bearer $ORGANIZER_T"); check "ORGANIZER can start match" "ALLOW" "$(echo "$R" | outcome)"

echo ""
echo "=== LINEUP PERMISSION TESTS (match now LIVE) ==="
curl -s -X POST $BASE/matches/$M1/participants -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d "{\"playerId\":\"$OWNER_PLAYER\",\"teamId\":\"$T1\",\"role\":\"STARTER\"}" > /dev/null
R=$(curl -s -X POST $BASE/matches/$M1/participants -H "Authorization: Bearer $OFFICIAL_T" -H 'Content-Type: application/json' -d "{\"playerId\":\"$OFFICIAL_PLAYER\",\"teamId\":\"$T2\",\"role\":\"STARTER\"}"); check "OFFICIAL cannot manage lineup" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/participants -H "Authorization: Bearer $ORGANIZER_T" -H 'Content-Type: application/json' -d "{\"playerId\":\"$OFFICIAL_PLAYER\",\"teamId\":\"$T2\",\"role\":\"STARTER\"}"); check "ORGANIZER can manage lineup" "ALLOW" "$(echo "$R" | outcome)"

echo ""
echo "=== EVENT PERMISSION TESTS ==="
R=$(curl -s -X POST $BASE/matches/$M1/events -H "Authorization: Bearer $ORGANIZER_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"organizer-goal\",\"eventType\":\"GOAL\",\"teamId\":\"$T1\",\"primaryPlayerId\":\"$OWNER_PLAYER\",\"matchClockSeconds\":1,\"metadata\":{}}"); check "ORGANIZER cannot record events" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/events -H "Authorization: Bearer $SCORER_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"scorer-goal-1\",\"eventType\":\"GOAL\",\"teamId\":\"$T1\",\"primaryPlayerId\":\"$OWNER_PLAYER\",\"matchClockSeconds\":100,\"metadata\":{}}"); check "SCORER can record events" "ALLOW" "$(echo "$R" | outcome)"
EVENT_ID=$(echo "$R" | jget "['data']['id']")

R=$(curl -s -X PATCH $BASE/matches/$M1/events/$EVENT_ID -H "Authorization: Bearer $SCORER_T" -H 'Content-Type: application/json' -d '{"reason":"scorer trying to correct"}'); check "SCORER cannot correct events" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/events/$EVENT_ID/retract -H "Authorization: Bearer $SCORER_T" -H 'Content-Type: application/json' -d '{"reason":"scorer trying to retract"}'); check "SCORER cannot retract events" "DENY" "$(echo "$R" | outcome)"

R=$(curl -s -X PATCH $BASE/matches/$M1/events/$EVENT_ID -H "Authorization: Bearer $OFFICIAL_T" -H 'Content-Type: application/json' -d '{"matchClockSeconds":101,"reason":"official correction"}'); check "OFFICIAL can correct events" "ALLOW" "$(echo "$R" | outcome)"

echo ""
echo "=== TEAM MANAGER TESTS ==="
R=$(curl -s -X POST $BASE/matches/$M1/events -H "Authorization: Bearer $TEAMMGR_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"teammgr-goal\",\"eventType\":\"GOAL\",\"teamId\":\"$T1\",\"primaryPlayerId\":\"$OWNER_PLAYER\",\"matchClockSeconds\":200,\"metadata\":{}}"); check "Own-team MANAGER can record events" "ALLOW" "$(echo "$R" | outcome)"

T3=$(curl -s -X POST $BASE/teams -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"name":"PM Unrelated Home"}' | jget "['data']['id']")
T4=$(curl -s -X POST $BASE/teams -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d '{"name":"PM Unrelated Away"}' | jget "['data']['id']")
M2=$(curl -s -X POST $BASE/matches -H "Authorization: Bearer $OWNER_T" -H 'Content-Type: application/json' -d "{\"homeTeamId\":\"$T3\",\"awayTeamId\":\"$T4\"}" | jget "['data']['id']")
curl -s -X POST $BASE/matches/$M2/start -H "Authorization: Bearer $OWNER_T" > /dev/null
R=$(curl -s -X POST $BASE/matches/$M2/events -H "Authorization: Bearer $TEAMMGR_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"teammgr-unrelated\",\"eventType\":\"GOAL\",\"teamId\":\"$T3\",\"matchClockSeconds\":1,\"metadata\":{}}"); check "MANAGER on unrelated match denied" "DENY" "$(echo "$R" | outcome)"

echo ""
echo "=== STRANGER TESTS (fully unrelated account) ==="
R=$(curl -s -X POST $BASE/matches/$M1/events -H "Authorization: Bearer $STRANGER_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"stranger-goal\",\"eventType\":\"GOAL\",\"teamId\":\"$T1\",\"matchClockSeconds\":1,\"metadata\":{}}"); check "Unrelated stranger cannot record events" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/operators -H "Authorization: Bearer $STRANGER_T" -H 'Content-Type: application/json' -d '{"email":"pm-stranger-'"$RUN_ID"'@test.flare","role":"SCORER"}'); check "Unrelated stranger cannot self-grant operator" "DENY" "$(echo "$R" | outcome)"
R=$(curl -s -X POST $BASE/matches/$M1/complete -H "Authorization: Bearer $STRANGER_T"); check "Unrelated stranger cannot finalize match" "DENY" "$(echo "$R" | outcome)"

echo ""
echo "=== REVOCATION TEST ==="
curl -s -X DELETE $BASE/matches/$M1/operators/$SCORER_ACCOUNT -H "Authorization: Bearer $OWNER_T" > /dev/null
R=$(curl -s -X POST $BASE/matches/$M1/events -H "Authorization: Bearer $SCORER_T" -H 'Content-Type: application/json' -d "{\"clientEventId\":\"scorer-after-revoke\",\"eventType\":\"GOAL\",\"teamId\":\"$T1\",\"matchClockSeconds\":300,\"metadata\":{}}"); check "Revoked SCORER immediately loses access" "DENY" "$(echo "$R" | outcome)"

echo ""
echo "=== FINALIZE TEST (OFFICIAL can finalize; do this last) ==="
R=$(curl -s -X POST $BASE/matches/$M1/complete -H "Authorization: Bearer $OFFICIAL_T"); check "OFFICIAL can finalize match" "ALLOW" "$(echo "$R" | outcome)"

echo ""
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
