from __future__ import annotations

from .models import Match, Team


class League:
    def __init__(self, name: str):
        self.name = name
        self.teams: list[Team] = []
        self.matches: list[Match] = []

    def add_team(self, team: Team) -> None:
        if any(t.name == team.name for t in self.teams):
            raise ValueError(f"{team.name} is already in the league")
        self.teams.append(team)

    def schedule_match(self, home: Team, away: Team) -> Match:
        if home not in self.teams or away not in self.teams:
            raise ValueError("Both teams must be part of the league")
        match = Match(home=home, away=away)
        self.matches.append(match)
        return match

    def standings(self) -> list[Team]:
        return sorted(
            self.teams,
            key=lambda t: (t.points, t.goal_difference, t.goals_for),
            reverse=True,
        )

    def print_standings(self) -> None:
        header = f"{'Team':<20}{'P':>3}{'W':>3}{'D':>3}{'L':>3}{'GF':>4}{'GA':>4}{'GD':>4}{'Pts':>5}"
        print(header)
        print("-" * len(header))
        for team in self.standings():
            print(
                f"{team.name:<20}{team.matches_played:>3}{team.wins:>3}{team.draws:>3}"
                f"{team.losses:>3}{team.goals_for:>4}{team.goals_against:>4}"
                f"{team.goal_difference:>4}{team.points:>5}"
            )

    def top_scorers(self, limit: int = 5) -> list:
        players = [p for t in self.teams for p in t.players]
        return sorted(players, key=lambda p: p.goals, reverse=True)[:limit]
