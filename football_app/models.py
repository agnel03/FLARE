from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Position(Enum):
    GOALKEEPER = "Goalkeeper"
    DEFENDER = "Defender"
    MIDFIELDER = "Midfielder"
    FORWARD = "Forward"


@dataclass
class Player:
    name: str
    position: Position
    number: int
    goals: int = 0
    assists: int = 0

    def record_goal(self, assists_by: int = 0) -> None:
        self.goals += 1

    def __str__(self) -> str:
        return f"#{self.number} {self.name} ({self.position.value})"


@dataclass
class Team:
    name: str
    players: list[Player] = field(default_factory=list)
    wins: int = 0
    draws: int = 0
    losses: int = 0
    goals_for: int = 0
    goals_against: int = 0

    def add_player(self, player: Player) -> None:
        if any(p.number == player.number for p in self.players):
            raise ValueError(f"Number {player.number} is already taken on {self.name}")
        self.players.append(player)

    @property
    def points(self) -> int:
        return self.wins * 3 + self.draws

    @property
    def goal_difference(self) -> int:
        return self.goals_for - self.goals_against

    @property
    def matches_played(self) -> int:
        return self.wins + self.draws + self.losses

    def __str__(self) -> str:
        return self.name


@dataclass
class Match:
    home: Team
    away: Team
    home_score: int | None = None
    away_score: int | None = None

    @property
    def is_played(self) -> bool:
        return self.home_score is not None and self.away_score is not None

    def play(self, home_score: int, away_score: int) -> None:
        if self.is_played:
            raise ValueError("This match has already been played")
        if home_score < 0 or away_score < 0:
            raise ValueError("Scores cannot be negative")

        self.home_score = home_score
        self.away_score = away_score

        self.home.goals_for += home_score
        self.home.goals_against += away_score
        self.away.goals_for += away_score
        self.away.goals_against += home_score

        if home_score > away_score:
            self.home.wins += 1
            self.away.losses += 1
        elif home_score < away_score:
            self.away.wins += 1
            self.home.losses += 1
        else:
            self.home.draws += 1
            self.away.draws += 1

    def __str__(self) -> str:
        if self.is_played:
            return f"{self.home} {self.home_score} - {self.away_score} {self.away}"
        return f"{self.home} vs {self.away} (not played)"
