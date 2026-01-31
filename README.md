# NBA Simulator Web

**This is a pure vibe-coding project which migrates original [Java version](https://github.com/MikeYan01/NBA-sim) to the web version. The migration leverages [Spec Kit](https://github.com/github/spec-kit), which allows me to focus on product scenarios and predictable outcomes instead of vibe coding every piece from scratch.**

Browser-based NBA basketball simulator migrated from Java to TypeScript/React. Features realistic game simulation with play-by-play commentary, full 82-game seasons, playoffs, and championship predictions.

![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Vite](https://img.shields.io/badge/Vite-7.x-purple) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-cyan) ![Tests](https://img.shields.io/badge/Tests-419%2B%20passed-green)

## Features

### Single Game Mode
- Select any two NBA teams for a head-to-head matchup
- Real-time play-by-play commentary with adjustable speed (1x to 64x)
- Detailed box scores with sortable statistics
- Score differential chart
- Authentic basketball simulation including fouls, free throws, overtime, and injuries
- Intelligent player rotation and foul protection

### Season Mode
- Full 82-game NBA season simulation
- Conference standings with playoff seeding
- Play-in tournament (7-10 seeds)
- Complete playoff bracket with best-of-7 series
- Playoff mode with realistic adjustments (slower pace, tougher defense)
- Series MVP with detailed stats (PTS, REB, AST, STL, BLK, FG%, 3P%)
- Game recaps with commentary and box scores
- Leaderboards for points, rebounds, assists, steals, blocks

### Championship Prediction
- Monte Carlo simulation for championship probabilities
- Run N simulations to predict champions
- Optimized fast simulation mode
- Web Worker for non-blocking background processing
- Progress indicator during prediction

### Bilingual Support
- Full English and Chinese (中文) support
- Player names, team names, and all UI elements localized
- Authentic commentary in both languages
- Language toggle in header

### Modern UI Features
- **Team color theming** - UI adapts to selected teams
- **Responsive design** - Works on mobile, tablet, and desktop
- **Progressive Web App (PWA)** - Install on any device
- **Modal-based game details** - Clean popup interface for game recaps

## Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/NBA-sim-web.git
cd NBA-sim-web/nba-sim-web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
npm run build
npm run preview
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- tests/models/Game.test.ts
```

## License

This project is for educational purposes. NBA team names and player data are property of the NBA.
