---
name: fetchRoster
description: Fetch current NBA2K player data and regenerate the repository's team roster CSVs. Use when refreshing raw ability data or updating team rosters.
---

# Refresh roster data

Run the complete refresh from the repository root.

## 1. Fetch every raw player

Fetch `https://api.nba2kapi.com/api/public/players` with
`teamType=curr&limit=100`.

1. Append each response's `data` array without changing any player object.
2. While `meta.pagination.hasMore` is true, request the next page with
   `cursor=meta.pagination.nextCursor`.
3. Treat a failed request, invalid response shape, repeated cursor, or
   `hasMore` without `nextCursor` as a failed refresh.
4. After every page succeeds, atomically write the combined JSON array to
   `nba-sim-web/public/data/rosters/temp.json`.

This step is complete when the saved array length equals the accumulated count
from every fetched page.

## 2. Regenerate team CSVs

Run:

```bash
python3 nba-sim-web/process_roster.py
```

The processor maps and validates NBA2K ability ratings from the nested JSON
structure. It treats all team CSVs and
`nba-sim-web/public/data/rosters/player-metadata.json` as one player metadata
catalog. A known player keeps the existing `name`, `englishName`, `position`,
`playerType`, and `rotationType` even after changing teams. Known API name
aliases resolve to the same catalog entry.

Only a player absent from the global catalog is new. New players keep the API
English name while `name`, `position`, `playerType`, and `rotationType` remain
blank for manual review. Players with incomplete ability data are skipped
rather than receiving invented ratings, and all such cases are reported.
Complete manual fields are retained in the catalog even when a player later
becomes a free agent.

The processor validates every generated numeric rating before replacing all 30
team CSVs as one batch. If an operating-system error prevents a complete
rollback, the command reports and retains the recovery-copy directory.

This step is complete when the command reports 30 processed teams.

## 3. Report

Report:

- raw players fetched and pages requested;
- players written, players skipped, and team CSV count;
- the raw JSON path and roster output directory;
- every new player requiring manual metadata review;
- every skipped player or raw position warning.
