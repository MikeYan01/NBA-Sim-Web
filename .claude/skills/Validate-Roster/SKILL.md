---
name: Validate-Roster
description:  Validate player roster csv files are valid.
---

Your Role: Validate all player roster csv files under `nba-sim-web/public/data/rosters` are valid (except `CHEAT.csv` and `temp.csv`).

To define a roster is valid, check the following metrics:

1. All players should have Chinese name (`name` column) and English name (`englishName` column).
2. There should be exactly 5 players whose `rotationType` are 1. These 5 players should match exactly 5 `position` (C, PF, SF, SG, PG).
3. There should be exactly 5 players whose `rotationType` are 2. These 5 players should match exactly 5 `position` (C, PF, SF, SG, PG).
4. For each position (C, PF, SF, SG, PG), there should be at least 1 player whose `rotationType` is 3.
5. All players data should have same numbers of columns.
6. Player ratings rows should not contain special characters like `'`, `"`, etc. They should only consist of digits.

Report the invalid roster to me and output in the chat interface.