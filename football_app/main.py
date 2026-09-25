from .league import League
from .models import Player, Position, Team


def build_sample_league() -> League:
    league = League("Sample Premier League")

    red_lions = Team("Red Lions")
    red_lions.add_player(Player("Alex Carter", Position.GOALKEEPER, 1))
    red_lions.add_player(Player("Sam Diaz", Position.DEFENDER, 4))
    red_lions.add_player(Player("Jordan Blake", Position.MIDFIELDER, 8))
    red_lions.add_player(Player("Taylor Reed", Position.FORWARD, 9))

    blue_eagles = Team("Blue Eagles")
    blue_eagles.add_player(Player("Morgan Lee", Position.GOALKEEPER, 1))
    blue_eagles.add_player(Player("Casey Nolan", Position.DEFENDER, 5))
    blue_eagles.add_player(Player("Riley Cruz", Position.MIDFIELDER, 10))
    blue_eagles.add_player(Player("Drew Ellis", Position.FORWARD, 11))

    green_wolves = Team("Green Wolves")
    green_wolves.add_player(Player("Jamie Fox", Position.GOALKEEPER, 1))
    green_wolves.add_player(Player("Avery Stone", Position.DEFENDER, 3))
    green_wolves.add_player(Player("Charlie Park", Position.MIDFIELDER, 6))
    green_wolves.add_player(Player("Robin Shaw", Position.FORWARD, 7))

    for team in (red_lions, blue_eagles, green_wolves):
        league.add_team(team)

    m1 = league.schedule_match(red_lions, blue_eagles)
    m1.play(2, 1)
    red_lions.players[3].record_goal()
    red_lions.players[2].record_goal()
    blue_eagles.players[3].record_goal()

    m2 = league.schedule_match(blue_eagles, green_wolves)
    m2.play(0, 0)

    m3 = league.schedule_match(green_wolves, red_lions)
    m3.play(1, 3)
    green_wolves.players[3].record_goal()
    for _ in range(3):
        red_lions.players[3].record_goal()

    return league


def main() -> None:
    league = build_sample_league()

    print(f"=== {league.name} ===\n")

    print("Results:")
    for match in league.matches:
        print(f"  {match}")

    print("\nStandings:")
    league.print_standings()

    print("\nTop scorers:")
    for player in league.top_scorers():
        if player.goals > 0:
            print(f"  {player}: {player.goals} goals")


if __name__ == "__main__":
    main()
