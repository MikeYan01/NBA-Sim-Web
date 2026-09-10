---
name: fetchRoster
description: Refresh NBA2K roster data and sync player metadata. Use when fetching raw abilities, regenerating team CSVs, or synchronizing metadata after roster edits.
---

# Refresh roster data

Run from the repository root. For a full refresh, follow every step. For
metadata-only updates or follow-up manual CSV corrections, start at step 3.

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
python3 .claude/skills/fetchRoster/scripts/process_roster.py
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
team CSVs and the metadata catalog as one batch. If an operating-system error
prevents a complete rollback, the command reports and retains the recovery-copy
directory.

This step is complete when the command reports 30 processed teams.

## 3. Synchronize player metadata

After updating the team CSVs, synchronize their current manual fields into
`nba-sim-web/public/data/rosters/player-metadata.json`:

```bash
python3 .claude/skills/fetchRoster/scripts/process_roster.py --sync-metadata
```

Repeat this step after any later manual CSV corrections. The command only
updates the catalog; it leaves raw JSON, team membership, ratings, and CSV files
unchanged. Complete CSV metadata takes precedence over catalog values, including
newly reviewed players. Incomplete rows are reported for manual review while
their existing catalog entries, if any, are retained.

This step is complete when the command reports the synchronized player and
catalog counts, every complete CSV row's five manual fields match the saved
catalog, and catalog-only players remain preserved. Report any unresolved rows.

## 4. Report

For a full refresh, report:

- raw players fetched and pages requested;
- players written, players skipped, and team CSV count;
- the raw JSON path and roster output directory;
- every new player requiring manual metadata review;
- every skipped player or raw position warning.

For either workflow, also report the metadata catalog path, synchronized player
count, total catalog entries, and any unresolved manual fields.
