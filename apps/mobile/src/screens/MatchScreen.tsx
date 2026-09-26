import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../auth-context";
import { apiRequest, ApiClientError } from "../api-client";
import { colors, space, type as typo } from "../theme";

interface Participant {
  playerId: string;
  teamId: string;
  isActive: boolean;
  player: { displayName: string };
}

interface MatchDetail {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  participants: Participant[];
}

interface TimelineEvent {
  id: string;
  eventType: string;
  matchClockSeconds: number;
  primaryPlayer: { displayName: string } | null;
  team: { name: string } | null;
}

export function MatchScreen() {
  const { me } = useAuth();
  const [matchIdInput, setMatchIdInput] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [minute, setMinute] = useState("1");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [m, ev] = await Promise.all([
        apiRequest<MatchDetail>(`/matches/${id}`, { auth: false }),
        apiRequest<TimelineEvent[]>(`/matches/${id}/timeline`, { auth: false }),
      ]);
      setMatch(m);
      setEvents(ev);
      setTeamId((prev) => prev ?? m.homeTeam.id);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not load match.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (matchId) load(matchId);
  }, [matchId, load]);

  const lifecycleAction = async (action: "start" | "pause" | "resume" | "complete") => {
    if (!matchId) return;
    try {
      await apiRequest(`/matches/${matchId}/${action}`, { method: "POST" });
      await load(matchId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed.");
    }
  };

  const recordGoal = async () => {
    if (!matchId || !teamId || !playerId) return;
    try {
      await apiRequest(`/matches/${matchId}/events`, {
        method: "POST",
        body: {
          clientEventId: `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          eventType: "GOAL",
          teamId,
          primaryPlayerId: playerId,
          matchClockSeconds: Math.max(0, Number(minute) || 0) * 60,
          metadata: { foot: "UNKNOWN", ownGoal: false, penalty: false, setPiece: false },
        },
      });
      setPlayerId(null);
      await load(matchId);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not record goal.");
    }
  };

  if (!matchId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Open a match</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: space.md }}>
          Paste a Match ID (from the web app's match URL) to open the live console.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Match ID"
          placeholderTextColor={colors.textSecondary}
          value={matchIdInput}
          onChangeText={setMatchIdInput}
        />
        <TouchableOpacity style={styles.button} onPress={() => setMatchId(matchIdInput.trim())}>
          <Text style={styles.buttonText}>Open match</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeParticipants = match?.participants.filter((p) => p.teamId === teamId && p.isActive) ?? [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(matchId)} tintColor={colors.brand} />}
    >
      <TouchableOpacity onPress={() => setMatchId(null)}>
        <Text style={{ color: colors.textSecondary, marginBottom: space.sm }}>‹ Open a different match</Text>
      </TouchableOpacity>

      {loading && !match && <ActivityIndicator color={colors.brand} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {match && (
        <>
          <View style={styles.scoreboard}>
            <Text style={styles.statusBadge}>{match.status}</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.teamName}>{match.homeTeam.name}</Text>
              <Text style={styles.score}>
                {match.homeScore} – {match.awayScore}
              </Text>
              <Text style={styles.teamName}>{match.awayTeam.name}</Text>
            </View>
          </View>

          {me && (
            <View style={styles.controlRow}>
              {match.status === "SCHEDULED" && (
                <TouchableOpacity style={styles.smallButton} onPress={() => lifecycleAction("start")}>
                  <Text style={styles.buttonText}>Start</Text>
                </TouchableOpacity>
              )}
              {match.status === "LIVE" && (
                <>
                  <TouchableOpacity style={[styles.smallButton, styles.secondary]} onPress={() => lifecycleAction("pause")}>
                    <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Pause</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, styles.danger]} onPress={() => lifecycleAction("complete")}>
                    <Text style={styles.buttonText}>Complete</Text>
                  </TouchableOpacity>
                </>
              )}
              {match.status === "PAUSED" && (
                <TouchableOpacity style={styles.smallButton} onPress={() => lifecycleAction("resume")}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {me && match.status === "LIVE" && (
            <View style={styles.composer}>
              <Text style={styles.sectionTitle}>Record a goal</Text>
              <View style={styles.teamToggle}>
                <TouchableOpacity
                  style={[styles.teamChip, teamId === match.homeTeam.id && styles.teamChipActive]}
                  onPress={() => {
                    setTeamId(match.homeTeam.id);
                    setPlayerId(null);
                  }}
                >
                  <Text style={styles.chipText}>{match.homeTeam.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.teamChip, teamId === match.awayTeam.id && styles.teamChipActive]}
                  onPress={() => {
                    setTeamId(match.awayTeam.id);
                    setPlayerId(null);
                  }}
                >
                  <Text style={styles.chipText}>{match.awayTeam.name}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.playerGrid}>
                {activeParticipants.length === 0 && (
                  <Text style={{ color: colors.textSecondary }}>No active players on this team yet.</Text>
                )}
                {activeParticipants.map((p) => (
                  <TouchableOpacity
                    key={p.playerId}
                    style={[styles.teamChip, playerId === p.playerId && styles.teamChipActive]}
                    onPress={() => setPlayerId(p.playerId)}
                  >
                    <Text style={styles.chipText}>{p.player.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.minuteRow}>
                <Text style={{ color: colors.textSecondary }}>Minute</Text>
                <TextInput
                  style={styles.minuteInput}
                  keyboardType="number-pad"
                  value={minute}
                  onChangeText={setMinute}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, !playerId && { opacity: 0.4 }]}
                onPress={recordGoal}
                disabled={!playerId}
              >
                <Text style={styles.buttonText}>⚽ Confirm goal</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionTitle}>Timeline</Text>
          {[...events].reverse().map((ev) => (
            <View key={ev.id} style={styles.timelineRow}>
              <Text style={styles.timelineClock}>{Math.floor(ev.matchClockSeconds / 60)}'</Text>
              <Text style={styles.timelineText}>
                {ev.eventType.replaceAll("_", " ")} {ev.primaryPlayer ? `— ${ev.primaryPlayer.displayName}` : ""}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: space.md },
  title: { fontSize: typo.heading1.fontSize, fontWeight: "800", color: colors.textPrimary, marginBottom: space.sm },
  sectionTitle: {
    fontSize: typo.heading2.fontSize,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: space.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: space.sm,
  },
  button: {
    minHeight: 48,
    backgroundColor: colors.brand,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
  smallButton: {
    minHeight: 44,
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: colors.surfaceMuted },
  danger: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: typo.body.fontSize },
  error: { color: colors.danger, marginBottom: space.sm },
  scoreboard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: space.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusBadge: { color: colors.live, fontWeight: "800", letterSpacing: 1, marginBottom: space.xs },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  teamName: { color: colors.textPrimary, fontWeight: "600", width: 100, textAlign: "center" },
  score: { color: colors.textPrimary, fontSize: typo.numericLarge.fontSize, fontWeight: "800" },
  controlRow: { flexDirection: "row", gap: space.sm, marginTop: space.md },
  composer: { backgroundColor: colors.surface, borderRadius: 16, padding: space.md, marginTop: space.md },
  teamToggle: { flexDirection: "row", gap: space.xs, marginBottom: space.sm },
  playerGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  teamChip: {
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  teamChipActive: { backgroundColor: colors.brandMuted, borderWidth: 1, borderColor: colors.brand },
  chipText: { color: colors.textPrimary, fontWeight: "600" },
  minuteRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  minuteInput: {
    minHeight: 44,
    width: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.textPrimary,
    textAlign: "center",
  },
  timelineRow: { flexDirection: "row", gap: space.sm, paddingVertical: space.xxs },
  timelineClock: { color: colors.textSecondary, width: 32 },
  timelineText: { color: colors.textPrimary },
});
