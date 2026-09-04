#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import shutil
import sys
import tempfile
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping, Sequence


TEAM_MAPPING = {
    "Atlanta Hawks": "Hawks",
    "Boston Celtics": "Celtics",
    "Brooklyn Nets": "Nets",
    "Charlotte Hornets": "Hornets",
    "Chicago Bulls": "Bulls",
    "Cleveland Cavaliers": "Cavaliers",
    "Dallas Mavericks": "Mavericks",
    "Denver Nuggets": "Nuggets",
    "Detroit Pistons": "Pistons",
    "Golden State Warriors": "Warriors",
    "Houston Rockets": "Rockets",
    "Indiana Pacers": "Pacers",
    "Los Angeles Clippers": "Clippers",
    "Los Angeles Lakers": "Lakers",
    "Memphis Grizzlies": "Grizzlies",
    "Miami Heat": "Heat",
    "Milwaukee Bucks": "Bucks",
    "Minnesota Timberwolves": "Timberwolves",
    "New Orleans Pelicans": "Pelicans",
    "New York Knicks": "Knicks",
    "Oklahoma City Thunder": "Thunder",
    "Orlando Magic": "Magic",
    "Philadelphia 76ers": "76ers",
    "Phoenix Suns": "Suns",
    "Portland Trail Blazers": "Trail Blazers",
    "Sacramento Kings": "Kings",
    "San Antonio Spurs": "Spurs",
    "Toronto Raptors": "Raptors",
    "Utah Jazz": "Jazz",
    "Washington Wizards": "Wizards",
}

POSITIONS = {"PG", "SG", "SF", "PF", "C"}
FIELDNAMES = (
    "name",
    "englishName",
    "position",
    "playerType",
    "rotationType",
    "rating",
    "insideRating",
    "midRating",
    "threeRating",
    "freeThrowPercent",
    "interiorDefense",
    "perimeterDefense",
    "orbRating",
    "drbRating",
    "astRating",
    "stlRating",
    "blkRating",
    "layupRating",
    "standDunk",
    "drivingDunk",
    "athleticism",
    "durability",
    "offConst",
    "defConst",
    "drawFoul",
)
NUMERIC_FIELDS = FIELDNAMES[5:]
MANUAL_FIELDS = FIELDNAMES[:5]
DIRECT_ATTRIBUTE_FIELDS = {
    "insideRating": "closeShot",
    "midRating": "midRangeShot",
    "threeRating": "threePointShot",
    "freeThrowPercent": "freeThrow",
    "interiorDefense": "interiorDefense",
    "perimeterDefense": "perimeterDefense",
    "orbRating": "offensiveRebound",
    "drbRating": "defensiveRebound",
    "stlRating": "steal",
    "blkRating": "block",
    "layupRating": "drivingLayup",
    "standDunk": "standingDunk",
    "drivingDunk": "drivingDunk",
    "durability": "durability",
    "offConst": "offensiveConsistency",
    "defConst": "defensiveConsistency",
    "drawFoul": "drawFoul",
}
DERIVED_ATTRIBUTE_FIELDS = {
    "astRating": ("passAccuracy", "passIQ", "passVision"),
    "athleticism": ("speed", "agility", "strength", "vertical", "stamina", "hustle"),
}
VALID_PLAYER_TYPES = {"1", "2", "3", "4", "5"}
VALID_ROTATION_TYPES = {"1", "2", "3"}
IGNORED_TEAMS = {"Free Agency"}
METADATA_FILENAME = "player-metadata.json"
PLAYER_NAME_ALIASES = {
    "carltoncarrington": "bubcarrington",
    "mohamedbamba": "mobamba",
    "nahshonhyland": "boneshyland",
    "nicolasclaxton": "nicclaxton",
    "robertdillingham": "robdillingham",
    "sviatoslavmykhailiuk": "svimykhailiuk",
}

APP_DIR = Path(__file__).resolve().parent
DEFAULT_INPUT = APP_DIR / "public" / "data" / "rosters" / "temp.json"
DEFAULT_OUTPUT_DIR = APP_DIR / "public" / "data" / "rosters"


class RosterProcessingError(ValueError):
    pass


class PlayerDataError(RosterProcessingError):
    pass


@dataclass(frozen=True)
class ExistingMetadata:
    row: dict[str, str]
    source_team: str | None


@dataclass(frozen=True)
class ManualReview:
    player: str
    team: str
    reason: str

    def __str__(self) -> str:
        return f"{self.player} ({self.team}: {self.reason})"


@dataclass(frozen=True)
class SkippedPlayer:
    player: str
    team: str
    reason: str

    def __str__(self) -> str:
        return f"{self.player} ({self.team}: {self.reason})"


@dataclass(frozen=True)
class RosterSummary:
    raw_player_count: int
    processed_player_count: int
    team_count: int
    ignored_teams: dict[str, int]
    manual_reviews: tuple[ManualReview, ...]
    skipped_players: tuple[SkippedPlayer, ...]
    position_warnings: tuple[str, ...]


def normalize_player_name(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).casefold()
    return "".join(character for character in normalized if character.isalnum())


def metadata_lookup_key(name: str) -> str:
    normalized_name = normalize_player_name(name)
    return PLAYER_NAME_ALIASES.get(normalized_name, normalized_name)


def unresolved_manual_fields(row: Mapping[str, str]) -> tuple[str, ...]:
    issues: list[str] = []
    if not row.get("name"):
        issues.append("name")
    if row.get("position") not in POSITIONS:
        issues.append("position")
    if row.get("playerType") not in VALID_PLAYER_TYPES:
        issues.append("playerType")
    if row.get("rotationType") not in VALID_ROTATION_TYPES:
        issues.append("rotationType")
    return tuple(issues)


def manual_metadata(row: Mapping[str, str]) -> dict[str, str]:
    return {field_name: row.get(field_name, "").strip() for field_name in MANUAL_FIELDS}


def parse_rating(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        rating = value
    elif isinstance(value, float) and value.is_integer():
        rating = int(value)
    elif isinstance(value, str) and value.strip().isdigit():
        rating = int(value.strip())
    else:
        return None
    return rating if 0 <= rating <= 100 else None


def load_raw_players(input_file: Path) -> list[dict[str, Any]]:
    try:
        with input_file.open("r", encoding="utf-8") as file:
            payload = json.load(file)
    except FileNotFoundError as error:
        raise RosterProcessingError(f"Input file not found: {input_file}") from error
    except json.JSONDecodeError as error:
        raise RosterProcessingError(
            f"Input file is not valid JSON: {input_file}: {error}"
        ) from error

    if not isinstance(payload, list):
        raise RosterProcessingError("Raw roster JSON must contain a top-level array")
    if any(not isinstance(player, dict) for player in payload):
        raise RosterProcessingError("Every raw roster entry must be a JSON object")
    return payload


def read_existing_team(
    team_file: Path,
) -> dict[str, dict[str, str]]:
    if not team_file.exists():
        return {}

    rows_by_name: dict[str, dict[str, str]] = {}
    with team_file.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        if tuple(reader.fieldnames or ()) != FIELDNAMES:
            raise RosterProcessingError(
                f"Existing roster has an unexpected header: {team_file}"
            )

        for line_number, row in enumerate(reader, start=2):
            english_name = row.get("englishName", "").strip()
            if not english_name:
                raise RosterProcessingError(
                    f"Existing roster has a blank English name: "
                    f"{team_file}:{line_number}"
                )
            normalized_name = metadata_lookup_key(english_name)
            if normalized_name in rows_by_name:
                raise RosterProcessingError(
                    f"Existing roster contains duplicate player "
                    f"'{english_name}': {team_file}"
                )
            rows_by_name[normalized_name] = {
                field_name: row.get(field_name, "").strip()
                for field_name in FIELDNAMES
            }
    return rows_by_name


def load_metadata_catalog(catalog_file: Path) -> dict[str, dict[str, str]]:
    if not catalog_file.exists():
        return {}

    try:
        with catalog_file.open("r", encoding="utf-8") as file:
            payload = json.load(file)
    except json.JSONDecodeError as error:
        raise RosterProcessingError(
            f"Metadata catalog is not valid JSON: {catalog_file}: {error}"
        ) from error

    players = payload.get("players") if isinstance(payload, dict) else None
    if (
        not isinstance(payload, dict)
        or payload.get("version") != 1
        or not isinstance(players, list)
    ):
        raise RosterProcessingError(
            f"Metadata catalog has an unsupported shape: {catalog_file}"
        )

    catalog: dict[str, dict[str, str]] = {}
    for index, player in enumerate(players, start=1):
        if not isinstance(player, dict):
            raise RosterProcessingError(
                f"Metadata catalog player {index} is not an object"
            )
        row = manual_metadata(player)
        english_name = row["englishName"]
        if not english_name or unresolved_manual_fields(row):
            raise RosterProcessingError(
                f"Metadata catalog player {index} has incomplete manual fields"
            )
        lookup_key = metadata_lookup_key(english_name)
        if lookup_key in catalog:
            raise RosterProcessingError(
                f"Metadata catalog contains duplicate player '{english_name}'"
            )
        catalog[lookup_key] = row
    return catalog


def load_existing_metadata(
    metadata_dir: Path,
    catalog_file: Path,
    team_mapping: Mapping[str, str],
) -> tuple[
    dict[str, ExistingMetadata],
    dict[str, dict[str, str]],
]:
    catalog = load_metadata_catalog(catalog_file)
    source_catalog_file = metadata_dir / METADATA_FILENAME
    if source_catalog_file.resolve() != catalog_file.resolve():
        catalog.update(load_metadata_catalog(source_catalog_file))
    metadata_by_name = {
        lookup_key: ExistingMetadata(row=row, source_team=None)
        for lookup_key, row in catalog.items()
    }
    roster_player_teams: dict[str, str] = {}

    for team in team_mapping.values():
        roster = read_existing_team(metadata_dir / f"{team}.csv")
        for lookup_key, row in roster.items():
            if lookup_key in roster_player_teams:
                raise RosterProcessingError(
                    f"Existing rosters contain duplicate player "
                    f"'{row['englishName']}'"
                )
            roster_player_teams[lookup_key] = team

            if not unresolved_manual_fields(row):
                metadata_by_name[lookup_key] = ExistingMetadata(
                    row=row,
                    source_team=team,
                )
                catalog[lookup_key] = manual_metadata(row)
            elif lookup_key not in metadata_by_name:
                metadata_by_name[lookup_key] = ExistingMetadata(
                    row=row,
                    source_team=team,
                )

    return metadata_by_name, catalog


def require_rating(value: Any, field_name: str, context: str) -> int:
    rating = parse_rating(value)
    if rating is None:
        raise PlayerDataError(f"missing or invalid {field_name}")
    return rating


def read_primary_position(
    player: Mapping[str, Any], context: str
) -> tuple[str, tuple[str, ...]]:
    raw_positions = player.get("positions")
    if raw_positions is None:
        return "", (f"{context}: no positions supplied",)
    if not isinstance(raw_positions, list):
        return "", (f"{context}: positions is not an array",)

    valid_positions = [
        position for position in raw_positions if position in POSITIONS
    ]
    warnings = tuple(
        f"{context}: ignored unsupported position {position!r}"
        for position in raw_positions
        if position not in POSITIONS
    )
    if not valid_positions:
        return "", warnings + (f"{context}: no supported position supplied",)
    return valid_positions[0], warnings


def convert_player(
    player: Mapping[str, Any],
    output_team: str,
    existing_row: Mapping[str, str] | None,
) -> tuple[dict[str, str], tuple[str, ...]]:
    raw_name = player.get("name")
    if not isinstance(raw_name, str) or not raw_name.strip():
        raise PlayerDataError("missing player name")
    raw_name = raw_name.strip()
    context = f"{raw_name} ({output_team})"

    overall = require_rating(player.get("overall"), "overall", context)
    attributes = player.get("attributes")
    if not isinstance(attributes, dict):
        raise PlayerDataError("missing attributes object")

    _, position_warnings = read_primary_position(player, context)
    if existing_row is None:
        manual_values = {
            "name": "",
            "englishName": raw_name,
            "position": "",
            "playerType": "",
            "rotationType": "",
        }
    else:
        manual_values = {
            field_name: existing_row[field_name] for field_name in MANUAL_FIELDS
        }

    row = {
        **manual_values,
        "rating": str(overall),
    }
    for output_field, attribute_name in DIRECT_ATTRIBUTE_FIELDS.items():
        row[output_field] = str(
            require_rating(attributes.get(attribute_name), attribute_name, context)
        )
    for output_field, attribute_names in DERIVED_ATTRIBUTE_FIELDS.items():
        values = [
            require_rating(attributes.get(attribute_name), attribute_name, context)
            for attribute_name in attribute_names
        ]
        row[output_field] = str(math.floor(sum(values) / len(values)))

    return (
        {field_name: row[field_name] for field_name in FIELDNAMES},
        position_warnings,
    )

def validate_team_rows(team: str, rows: Sequence[Mapping[str, str]]) -> None:
    seen_names: set[str] = set()
    for row_number, row in enumerate(rows, start=2):
        if set(row.keys()) != set(FIELDNAMES):
            raise RosterProcessingError(f"{team} row {row_number} has invalid columns")
        if not row["englishName"]:
            raise RosterProcessingError(
                f"{team} row {row_number} has a blank English name"
            )

        normalized_name = normalize_player_name(row["englishName"])
        if normalized_name in seen_names:
            raise RosterProcessingError(
                f"{team} contains duplicate player '{row['englishName']}'"
            )
        seen_names.add(normalized_name)

        if row["position"] and row["position"] not in POSITIONS:
            raise RosterProcessingError(
                f"{team} row {row_number} has invalid position '{row['position']}'"
            )
        if row["playerType"] and row["playerType"] not in VALID_PLAYER_TYPES:
            raise RosterProcessingError(
                f"{team} row {row_number} has invalid playerType"
            )
        if row["rotationType"] and row["rotationType"] not in VALID_ROTATION_TYPES:
            raise RosterProcessingError(
                f"{team} row {row_number} has invalid rotationType"
            )
        for field_name in NUMERIC_FIELDS:
            if parse_rating(row[field_name]) is None:
                raise RosterProcessingError(
                    f"{team} row {row_number} has invalid {field_name}"
                )


def write_csv(path: Path, rows: Sequence[Mapping[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def write_metadata_catalog(
    path: Path, catalog: Mapping[str, Mapping[str, str]]
) -> None:
    players = sorted(
        (manual_metadata(row) for row in catalog.values()),
        key=lambda row: metadata_lookup_key(row["englishName"]),
    )
    with path.open("w", encoding="utf-8") as file:
        json.dump(
            {"version": 1, "players": players},
            file,
            ensure_ascii=False,
            indent=2,
        )
        file.write("\n")


def write_team_rosters(
    output_dir: Path,
    rosters: Mapping[str, Sequence[Mapping[str, str]]],
    metadata_catalog: Mapping[str, Mapping[str, str]] | None = None,
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    stage_dir = Path(tempfile.mkdtemp(prefix=".roster-build-", dir=output_dir))
    retain_recovery_files = False
    try:
        generated_dir = stage_dir / "generated"
        backup_dir = stage_dir / "backup"
        generated_dir.mkdir()
        backup_dir.mkdir()

        targets: list[tuple[Path, Path, Path | None]] = []
        for team, rows in sorted(rosters.items()):
            staged_file = generated_dir / f"{team}.csv"
            target_file = output_dir / f"{team}.csv"
            backup_file: Path | None = None
            write_csv(staged_file, rows)
            if target_file.exists():
                backup_file = backup_dir / target_file.name
                shutil.copy2(target_file, backup_file)
            targets.append((staged_file, target_file, backup_file))

        if metadata_catalog is not None:
            staged_file = generated_dir / METADATA_FILENAME
            target_file = output_dir / METADATA_FILENAME
            backup_file = None
            write_metadata_catalog(staged_file, metadata_catalog)
            if target_file.exists():
                backup_file = backup_dir / target_file.name
                shutil.copy2(target_file, backup_file)
            targets.append((staged_file, target_file, backup_file))

        replaced: list[tuple[Path, Path | None]] = []
        try:
            for staged_file, target_file, backup_file in targets:
                os.replace(staged_file, target_file)
                replaced.append((target_file, backup_file))
        except OSError as error:
            rollback_errors: list[str] = []
            for target_file, backup_file in reversed(replaced):
                try:
                    if backup_file is None:
                        target_file.unlink(missing_ok=True)
                    else:
                        shutil.copy2(backup_file, target_file)
                except OSError as rollback_error:
                    rollback_errors.append(f"{target_file}: {rollback_error}")
            if rollback_errors:
                retain_recovery_files = True
                raise RosterProcessingError(
                    "Roster update failed and rollback was incomplete: "
                    + "; ".join(rollback_errors)
                    + f". Recovery copies retained at {backup_dir}"
                ) from error
            raise RosterProcessingError(
                f"Roster update failed; previous files were restored: {error}"
            ) from error
    finally:
        if not retain_recovery_files:
            shutil.rmtree(stage_dir, ignore_errors=True)


def process_roster(
    input_file: Path | str,
    output_dir: Path | str,
    team_mapping: Mapping[str, str] = TEAM_MAPPING,
    metadata_dir: Path | str | None = None,
) -> RosterSummary:
    input_path = Path(input_file)
    output_path = Path(output_dir)
    metadata_path = Path(metadata_dir) if metadata_dir is not None else output_path
    if len(set(team_mapping.values())) != len(team_mapping):
        raise RosterProcessingError("Team output names must be unique")

    raw_players = load_raw_players(input_path)
    existing_metadata, metadata_catalog = load_existing_metadata(
        metadata_path,
        output_path / METADATA_FILENAME,
        team_mapping,
    )
    players_by_team: dict[str, list[dict[str, Any]]] = {
        team: [] for team in team_mapping
    }
    ignored_teams: Counter[str] = Counter()
    seen_raw_names: dict[str, str] = {}

    for player in raw_players:
        team = player.get("team")
        if not isinstance(team, str) or not team.strip():
            raise RosterProcessingError("A raw player is missing a team name")
        if team not in team_mapping:
            if team in IGNORED_TEAMS:
                ignored_teams[team] += 1
                continue
            raise RosterProcessingError(
                f"Raw roster contains an unexpected team label: {team}"
            )

        raw_name = player.get("name")
        if not isinstance(raw_name, str) or not raw_name.strip():
            raise RosterProcessingError(f"{team} contains a player without a name")
        lookup_key = metadata_lookup_key(raw_name)
        if lookup_key in seen_raw_names:
            raise RosterProcessingError(
                f"Raw roster contains duplicate player '{raw_name}' for "
                f"{seen_raw_names[lookup_key]} and {team}"
            )
        seen_raw_names[lookup_key] = team
        players_by_team[team].append(player)

    missing_teams = [team for team, players in players_by_team.items() if not players]
    if missing_teams:
        raise RosterProcessingError(
            "Raw roster is missing mapped teams: " + ", ".join(missing_teams)
        )

    rosters: dict[str, list[dict[str, str]]] = {}
    manual_reviews: list[ManualReview] = []
    skipped_players: list[SkippedPlayer] = []
    position_warnings: list[str] = []

    for full_team_name, short_team_name in team_mapping.items():
        processed_players: list[dict[str, str]] = []

        for player in players_by_team[full_team_name]:
            raw_name = str(player["name"]).strip()
            lookup_key = metadata_lookup_key(raw_name)
            existing = existing_metadata.get(lookup_key)
            existing_row = existing.row if existing is not None else None
            try:
                processed, warnings = convert_player(
                    player, short_team_name, existing_row
                )
            except PlayerDataError as error:
                skipped_players.append(
                    SkippedPlayer(raw_name, short_team_name, str(error))
                )
                continue

            processed_players.append(processed)
            position_warnings.extend(warnings)
            if existing_row is None:
                manual_reviews.append(
                    ManualReview(raw_name, short_team_name, "new player")
                )
            else:
                unresolved_fields = unresolved_manual_fields(processed)
                if unresolved_fields:
                    manual_reviews.append(
                        ManualReview(
                            raw_name,
                            short_team_name,
                            "unresolved fields: " + ", ".join(unresolved_fields),
                        )
                    )
                else:
                    metadata_catalog[
                        metadata_lookup_key(processed["englishName"])
                    ] = manual_metadata(processed)

        if len(processed_players) < 10:
            raise RosterProcessingError(
                f"{short_team_name} has only {len(processed_players)} valid players; "
                "at least 10 are required before replacing roster files"
            )

        processed_players.sort(
            key=lambda row: (
                -int(row["rating"]),
                normalize_player_name(row["englishName"]),
            )
        )
        validate_team_rows(short_team_name, processed_players)
        rosters[short_team_name] = processed_players

    write_team_rosters(output_path, rosters, metadata_catalog)

    return RosterSummary(
        raw_player_count=len(raw_players),
        processed_player_count=sum(len(rows) for rows in rosters.values()),
        team_count=len(rosters),
        ignored_teams=dict(sorted(ignored_teams.items())),
        manual_reviews=tuple(
            sorted(manual_reviews, key=lambda review: (review.team, review.player))
        ),
        skipped_players=tuple(
            sorted(skipped_players, key=lambda player: (player.team, player.player))
        ),
        position_warnings=tuple(sorted(position_warnings)),
    )


def print_items(heading: str, items: Sequence[object]) -> None:
    print(f"{heading} ({len(items)}):", file=sys.stderr)
    for item in items:
        print(f"  - {item}", file=sys.stderr)


def print_summary(summary: RosterSummary, output_dir: Path) -> None:
    print(
        f"Processed {summary.processed_player_count} players across "
        f"{summary.team_count} teams into {output_dir}"
    )
    if summary.ignored_teams:
        ignored = ", ".join(
            f"{team}: {count}" for team, count in summary.ignored_teams.items()
        )
        print(f"Ignored non-roster players ({ignored})")
    if summary.manual_reviews:
        print_items(
            "Players requiring manual metadata review",
            summary.manual_reviews,
        )
    if summary.skipped_players:
        print_items(
            "Players skipped because ability data is incomplete",
            summary.skipped_players,
        )
    if summary.position_warnings:
        print_items("Raw position warnings", summary.position_warnings)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert raw NBA2K player JSON into team roster CSV files."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=DEFAULT_INPUT,
        help=f"Raw player JSON path (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Team CSV directory (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--metadata-dir",
        type=Path,
        help=(
            "Directory containing pre-refresh team CSVs used as the manual "
            "metadata source (default: --output-dir)"
        ),
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        summary = process_roster(
            args.input,
            args.output_dir,
            metadata_dir=args.metadata_dir,
        )
    except (OSError, RosterProcessingError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print_summary(summary, args.output_dir.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
