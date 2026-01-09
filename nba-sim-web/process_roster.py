import csv
import math
import os

# Team name mapping from the main roster to team file names
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
    "Washington Wizards": "Wizards"
}

def process_player(row):
    """
    Process a single player row and extract the required attributes.
    
    Args:
        row: Dictionary containing player data from the main roster
        
    Returns:
        Dictionary with processed player data
    """
    # Calculate astRating: (passAccuracy + passIQ + passVision) / 3, use math.floor
    pass_accuracy = int(row['passAccuracy'])
    pass_iq = int(row['passIQ'])
    pass_vision = int(row['passVision'])
    ast_rating = math.floor((pass_accuracy + pass_iq + pass_vision) / 3)
    
    # Calculate athleticism: (speed + agility + strength + vertical + stamina + hustle) / 6, use math.floor
    speed = int(row['speed'])
    agility = int(row['agility'])
    strength = int(row['strength'])
    vertical = int(row['vertical'])
    stamina = int(row['stamina'])
    hustle = int(row['hustle'])
    athleticism = math.floor((speed + agility + strength + vertical + stamina + hustle) / 6)
    
    # Create processed player data
    processed_data = {
        'name': row['name'],
        'englishName': row['name'],  # Same as name since the main roster uses English names
        'position': row['position'],
        'playerType': '',  # This will need to be filled manually or with additional logic
        'rotationType': '',  # This will need to be filled manually or with additional logic
        'rating': row['overallAttribute'],
        'insideRating': row['closeShot'],
        'midRating': row['midRangeShot'],
        'threeRating': row['threePointShot'],
        'freeThrowPercent': row['freeThrow'],
        'interiorDefense': row['interiorDefense'],
        'perimeterDefense': row['perimeterDefense'],
        'orbRating': row['offensiveRebound'],
        'drbRating': row['defensiveRebound'],
        'astRating': str(ast_rating),
        'stlRating': row['steal'],
        'blkRating': row['block'],
        'layupRating': row['layup'],
        'standDunk': row['standingDunk'],
        'drivingDunk': row['drivingDunk'],
        'athleticism': str(athleticism),
        'durability': row['overallDurability'],
        'offConst': row['offensiveConsistency'],
        'defConst': row['defensiveConsistency'],
        'drawFoul': row['drawFoul']
    }
    
    return processed_data

def read_existing_team_data(team_file_path):
    """
    Read existing team CSV to get all player data for preservation.
    
    Args:
        team_file_path: Path to the existing team CSV file
        
    Returns:
        Dictionary mapping player English names to their existing data
    """
    player_info = {}
    if os.path.exists(team_file_path):
        with open(team_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Use englishName as the primary key for matching
                english_name = row.get('englishName', row.get('name', ''))
                if english_name:
                    player_info[english_name] = {
                        'name': row.get('name', ''),
                        'englishName': row.get('englishName', ''),
                        'position': row.get('position', ''),
                        'playerType': row.get('playerType', ''),
                        'rotationType': row.get('rotationType', '')
                    }
    return player_info

def process_roster(input_file, output_dir):
    """
    Process the main roster file and generate team-specific CSV files.
    
    Args:
        input_file: Path to the main roster CSV
        output_dir: Directory where team CSV files will be saved
    """
    # Read the main roster
    players_by_team = {}
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            team = row['team']
            if team not in players_by_team:
                players_by_team[team] = []
            players_by_team[team].append(row)
    
    # Process each team
    for team_full_name, players in players_by_team.items():
        if team_full_name in TEAM_MAPPING:
            team_short_name = TEAM_MAPPING[team_full_name]
            output_file = os.path.join(output_dir, f"{team_short_name}.csv")
            
            # Read existing team data to preserve name, englishName, position, playerType, and rotationType
            existing_player_info = read_existing_team_data(output_file)
            
            print(f"Processing {team_full_name} -> {team_short_name}.csv ({len(players)} players)")
            
            # Process players for this team
            processed_players = []
            for player_row in players:
                processed = process_player(player_row)
                
                # Check if this player exists in the existing file
                player_english_name = player_row['name']  # The main roster uses English names
                if player_english_name in existing_player_info:
                    # Preserve all the specified columns from existing data
                    existing_data = existing_player_info[player_english_name]
                    processed['name'] = existing_data['name']
                    processed['englishName'] = existing_data['englishName']
                    processed['position'] = existing_data['position']
                    processed['playerType'] = existing_data['playerType']
                    processed['rotationType'] = existing_data['rotationType']
                
                processed_players.append(processed)
            
            # Sort by rating (descending) to have best players first
            processed_players.sort(key=lambda x: int(x['rating']), reverse=True)
            
            # Write to team CSV file
            fieldnames = [
                'name', 'englishName', 'position', 'playerType', 'rotationType',
                'rating', 'insideRating', 'midRating', 'threeRating', 'freeThrowPercent',
                'interiorDefense', 'perimeterDefense', 'orbRating', 'drbRating', 'astRating',
                'stlRating', 'blkRating', 'layupRating', 'standDunk', 'drivingDunk',
                'athleticism', 'durability', 'offConst', 'defConst', 'drawFoul'
            ]
            
            with open(output_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(processed_players)
            
            print(f"  -> Saved {len(processed_players)} players to {output_file}")
        else:
            print(f"Warning: No mapping found for team '{team_full_name}'")

def main():
    # File paths
    input_file = 'public/data/rosters/temp.csv'
    output_dir = 'public/data/rosters'
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found!")
        return
    
    print("Starting roster processing...")
    print(f"Input file: {input_file}")
    print(f"Output directory: {output_dir}")
    print("-" * 60)
    
    # Process the roster
    process_roster(input_file, output_dir)
    
    print("-" * 60)
    print("Roster processing completed!")

if __name__ == "__main__":
    main()
