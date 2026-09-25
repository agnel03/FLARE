#   FLARE

## Sample Football App

A small Python package modeling a football (soccer) league: players, teams,
matches, and standings.

Run the demo:

```
python3 -m football_app.main
```

### Structure

- `football_app/models.py` — `Player`, `Team`, `Match` classes
- `football_app/league.py` — `League` class for scheduling matches and computing standings/top scorers
- `football_app/main.py` — sample script that builds a league, plays matches, and prints results
