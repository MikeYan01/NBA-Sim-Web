import csv
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import process_roster as roster_processor
from process_roster import (
    FIELDNAMES,
    METADATA_FILENAME,
    PLAYER_NAME_ALIASES,
    RosterProcessingError,
    metadata_lookup_key,
    process_roster,
    write_metadata_catalog,
    write_team_rosters,
)


def make_existing_row(number, prefix):
    rating = 90 - number
    return {
        "name": f"{prefix}球员{number}",
        "englishName": f"{prefix} Player {number}",
        "position": ("PG", "SG", "SF", "PF", "C")[number % 5],
        "playerType": str((number % 5) + 1),
        "rotationType": str((number % 3) + 1),
        **{field: str(rating) for field in FIELDNAMES[5:]},
    }


def make_attributes(base=50):
    return {
        "agility": base + 20,
        "block": base + 1,
        "closeShot": base + 2,
        "defensiveConsistency": base + 3,
        "defensiveRebound": base + 4,
        "drawFoul": base + 5,
        "drivingDunk": base + 6,
        "drivingLayup": base + 7,
        "durability": base + 8,
        "freeThrow": base + 9,
        "hustle": base + 10,
        "interiorDefense": base + 11,
        "midRangeShot": base + 12,
        "offensiveConsistency": base + 13,
        "offensiveRebound": base + 14,
        "passAccuracy": base + 15,
        "passIQ": base + 16,
        "passVision": base + 17,
        "perimeterDefense": base + 18,
        "speed": base + 19,
        "stamina": base + 21,
        "standingDunk": base + 22,
        "steal": base + 23,
        "strength": base + 24,
        "threePointShot": base + 25,
        "vertical": base + 26,
    }


def make_raw_player(name, team, position="PG", overall=85, attributes=None):
    return {
        "name": name,
        "team": team,
        "overall": overall,
        "positions": [position],
        "attributes": attributes if attributes is not None else make_attributes(),
    }


def write_csv(path, rows):
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDNAMES, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def read_csv(path):
    with path.open("r", encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


class ProcessRosterTests(unittest.TestCase):
    def test_maps_ability_data_and_preserves_transfer_metadata(self):
        mapping = {"Alpha Team": "Alpha", "Beta Team": "Beta"}
        alpha_rows = [make_existing_row(number, "Alpha") for number in range(10)]
        beta_rows = [make_existing_row(number, "Beta") for number in range(11)]
        beta_rows[0] = {
            **beta_rows[0],
            "name": "尼古拉斯·克拉克斯顿",
            "englishName": "Nic Claxton",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            metadata_dir = root / "metadata"
            output_dir.mkdir()
            metadata_dir.mkdir()
            write_csv(metadata_dir / "Alpha.csv", alpha_rows)
            write_csv(metadata_dir / "Beta.csv", beta_rows)

            transferred = beta_rows[0]
            raw_players = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in alpha_rows
            ]
            raw_players[-1] = make_raw_player(
                "Nicolas Claxton",
                "Alpha Team",
                "C",
                overall=91,
                attributes=make_attributes(10),
            )
            raw_players.append(
                make_raw_player(
                    "Rookie Player",
                    "Alpha Team",
                    "SG",
                    overall=88,
                    attributes=make_attributes(20),
                )
            )
            raw_players.extend(
                make_raw_player(row["englishName"], "Beta Team", row["position"])
                for row in beta_rows
                if row is not transferred
            )

            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")
            summary = process_roster(
                input_file,
                output_dir,
                mapping,
                metadata_dir=metadata_dir,
            )

            self.assertEqual(summary.raw_player_count, 21)
            self.assertEqual(summary.processed_player_count, 21)
            self.assertEqual(len(summary.manual_reviews), 1)

            alpha_output = read_csv(output_dir / "Alpha.csv")
            known = next(
                row
                for row in alpha_output
                if row["englishName"] == alpha_rows[0]["englishName"]
            )
            self.assertEqual(known["name"], alpha_rows[0]["name"])
            self.assertEqual(known["playerType"], alpha_rows[0]["playerType"])
            self.assertEqual(known["rotationType"], alpha_rows[0]["rotationType"])

            moved = next(
                row
                for row in alpha_output
                if row["englishName"] == transferred["englishName"]
            )
            self.assertEqual(moved["name"], transferred["name"])
            self.assertEqual(moved["position"], transferred["position"])
            self.assertEqual(moved["playerType"], transferred["playerType"])
            self.assertEqual(moved["rotationType"], transferred["rotationType"])
            self.assertEqual(moved["rating"], "91")
            self.assertEqual(moved["insideRating"], "12")
            self.assertEqual(moved["layupRating"], "17")
            self.assertEqual(moved["astRating"], "26")
            self.assertEqual(moved["athleticism"], "30")

            rookie = next(
                row for row in alpha_output if row["englishName"] == "Rookie Player"
            )
            self.assertEqual(rookie["name"], "")
            self.assertEqual(rookie["position"], "")
            self.assertEqual(rookie["playerType"], "")
            self.assertEqual(rookie["rotationType"], "")

            catalog = json.loads(
                (output_dir / METADATA_FILENAME).read_text(encoding="utf-8")
            )
            catalog_names = {
                row["englishName"] for row in catalog["players"]
            }
            self.assertIn("Nic Claxton", catalog_names)
            self.assertNotIn("Rookie Player", catalog_names)

            second_summary = process_roster(input_file, output_dir, mapping)
            unresolved = {
                review.player: review.reason
                for review in second_summary.manual_reviews
            }
            self.assertNotIn("Nicolas Claxton", unresolved)
            self.assertIn("Rookie Player", unresolved)

    def test_catalog_preserves_metadata_for_returning_player(self):
        mapping = {"Alpha Team": "Alpha"}
        existing_rows = [make_existing_row(number, "Alpha") for number in range(11)]
        returning = existing_rows[0]

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            output_dir.mkdir()
            write_csv(output_dir / "Alpha.csv", existing_rows)

            first_raw = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in existing_rows[1:]
            ]
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(first_raw), encoding="utf-8")
            process_roster(input_file, output_dir, mapping)

            second_raw = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in existing_rows[1:10]
            ]
            second_raw.append(
                make_raw_player(
                    returning["englishName"],
                    "Alpha Team",
                    "C",
                )
            )
            input_file.write_text(json.dumps(second_raw), encoding="utf-8")
            summary = process_roster(input_file, output_dir, mapping)

            returned = next(
                row
                for row in read_csv(output_dir / "Alpha.csv")
                if row["englishName"] == returning["englishName"]
            )
            self.assertEqual(returned["name"], returning["name"])
            self.assertEqual(returned["position"], returning["position"])
            self.assertEqual(returned["playerType"], returning["playerType"])
            self.assertEqual(returned["rotationType"], returning["rotationType"])
            self.assertFalse(summary.manual_reviews)

    def test_separate_metadata_source_copies_catalog_only_players(self):
        mapping = {"Alpha Team": "Alpha"}
        active_rows = [make_existing_row(number, "Alpha") for number in range(10)]
        departed = make_existing_row(20, "Departed")

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            metadata_dir = root / "metadata"
            output_dir = root / "output"
            metadata_dir.mkdir()
            output_dir.mkdir()
            write_csv(metadata_dir / "Alpha.csv", active_rows)
            write_metadata_catalog(
                metadata_dir / METADATA_FILENAME,
                {
                    metadata_lookup_key(departed["englishName"]): departed,
                },
            )

            raw_players = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in active_rows
            ]
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")
            process_roster(
                input_file,
                output_dir,
                mapping,
                metadata_dir=metadata_dir,
            )

            catalog = json.loads(
                (output_dir / METADATA_FILENAME).read_text(encoding="utf-8")
            )
            self.assertIn(
                departed["englishName"],
                {row["englishName"] for row in catalog["players"]},
            )

    def test_known_api_name_aliases_resolve_to_existing_metadata(self):
        expected_aliases = {
            "Carlton Carrington": "Bub Carrington",
            "Mohamed Bamba": "Mo Bamba",
            "Nah’Shon Hyland": "Bones Hyland",
            "Nicolas Claxton": "Nic Claxton",
            "Robert Dillingham": "Rob Dillingham",
            "Sviatoslav Mykhailiuk": "Svi Mykhailiuk",
        }
        self.assertEqual(len(PLAYER_NAME_ALIASES), len(expected_aliases))
        for api_name, roster_name in expected_aliases.items():
            self.assertEqual(
                metadata_lookup_key(api_name),
                metadata_lookup_key(roster_name),
            )

    def test_alias_forms_are_rejected_as_duplicate_raw_players(self):
        mapping = {"Alpha Team": "Alpha"}

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            output_dir.mkdir()
            raw_players = [
                make_raw_player(f"Player {number}", "Alpha Team")
                for number in range(8)
            ]
            raw_players.extend(
                [
                    make_raw_player("Nic Claxton", "Alpha Team"),
                    make_raw_player("Nicolas Claxton", "Alpha Team"),
                ]
            )
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")

            with self.assertRaisesRegex(
                RosterProcessingError, "duplicate player"
            ):
                process_roster(input_file, output_dir, mapping)

    def test_skips_incomplete_ability_data_without_inventing_ratings(self):
        mapping = {"Alpha Team": "Alpha"}
        existing_rows = [make_existing_row(number, "Alpha") for number in range(10)]

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            output_dir.mkdir()
            write_csv(output_dir / "Alpha.csv", existing_rows)

            raw_players = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in existing_rows
            ]
            incomplete_attributes = make_attributes()
            incomplete_attributes.pop("passVision")
            raw_players.append(
                make_raw_player(
                    "Incomplete Player",
                    "Alpha Team",
                    attributes=incomplete_attributes,
                )
            )
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")

            summary = process_roster(input_file, output_dir, mapping)

            self.assertEqual(summary.processed_player_count, 10)
            self.assertEqual(len(summary.skipped_players), 1)
            self.assertIn("passVision", summary.skipped_players[0].reason)
            self.assertNotIn(
                "Incomplete Player",
                {row["englishName"] for row in read_csv(output_dir / "Alpha.csv")},
            )

    def test_global_validation_failure_leaves_existing_csv_unchanged(self):
        mapping = {"Alpha Team": "Alpha", "Beta Team": "Beta"}
        alpha_rows = [make_existing_row(number, "Alpha") for number in range(10)]
        beta_rows = [make_existing_row(number, "Beta") for number in range(10)]

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            output_dir.mkdir()
            alpha_file = output_dir / "Alpha.csv"
            beta_file = output_dir / "Beta.csv"
            write_csv(alpha_file, alpha_rows)
            write_csv(beta_file, beta_rows)
            original_alpha = alpha_file.read_bytes()
            original_beta = beta_file.read_bytes()

            raw_players = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in alpha_rows
            ]
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")

            with self.assertRaisesRegex(
                RosterProcessingError, "missing mapped teams"
            ):
                process_roster(input_file, output_dir, mapping)

            self.assertEqual(alpha_file.read_bytes(), original_alpha)
            self.assertEqual(beta_file.read_bytes(), original_beta)

    def test_unexpected_team_label_leaves_existing_csv_unchanged(self):
        mapping = {"Alpha Team": "Alpha"}
        existing_rows = [make_existing_row(number, "Alpha") for number in range(10)]

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            output_dir = root / "rosters"
            output_dir.mkdir()
            output_file = output_dir / "Alpha.csv"
            write_csv(output_file, existing_rows)
            original_contents = output_file.read_bytes()

            raw_players = [
                make_raw_player(row["englishName"], "Alpha Team", row["position"])
                for row in existing_rows
            ]
            raw_players.append(make_raw_player("Mystery Player", "Expansion Team"))
            input_file = root / "temp.json"
            input_file.write_text(json.dumps(raw_players), encoding="utf-8")

            with self.assertRaisesRegex(
                RosterProcessingError, "unexpected team label"
            ):
                process_roster(input_file, output_dir, mapping)

            self.assertEqual(output_file.read_bytes(), original_contents)

    def test_incomplete_rollback_retains_recovery_copy(self):
        rows = [make_existing_row(0, "Alpha")]

        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            alpha_file = output_dir / "Alpha.csv"
            beta_file = output_dir / "Beta.csv"
            write_csv(alpha_file, rows)
            write_csv(beta_file, rows)
            original_alpha = alpha_file.read_bytes()

            real_replace = roster_processor.os.replace
            real_copy = roster_processor.shutil.copy2

            def fail_second_replace(source, target):
                source_path = Path(source)
                if source_path.parent.name == "generated" and source_path.name == "Beta.csv":
                    raise OSError("replace failed")
                return real_replace(source, target)

            def fail_alpha_restore(source, target):
                source_path = Path(source)
                target_path = Path(target)
                if source_path.parent.name == "backup" and target_path.name == "Alpha.csv":
                    raise OSError("restore failed")
                return real_copy(source, target)

            with (
                patch.object(roster_processor.os, "replace", side_effect=fail_second_replace),
                patch.object(roster_processor.shutil, "copy2", side_effect=fail_alpha_restore),
            ):
                with self.assertRaisesRegex(
                    RosterProcessingError, "Recovery copies retained at"
                ) as raised:
                    write_team_rosters(
                        output_dir,
                        {"Alpha": rows, "Beta": rows},
                    )

            match = re.search(
                r"Recovery copies retained at (.+)$", str(raised.exception)
            )
            self.assertIsNotNone(match)
            backup_dir = Path(match.group(1))
            self.assertTrue((backup_dir / "Alpha.csv").exists())
            self.assertEqual((backup_dir / "Alpha.csv").read_bytes(), original_alpha)
            shutil.rmtree(backup_dir.parent)


if __name__ == "__main__":
    unittest.main()
