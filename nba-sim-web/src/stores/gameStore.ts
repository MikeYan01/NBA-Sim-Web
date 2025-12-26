import { create } from 'zustand'
import { GameResult } from '../models/Game'
import { SeasonResult } from '../models/Season'
import { Team } from '../models/Team'

interface GameState {
    // Single Game Mode
    currentGame: GameResult | null
    setGame: (game: GameResult | null) => void

    // Season Mode
    currentSeason: SeasonResult | null
    setSeason: (season: SeasonResult | null) => void

    // Teams
    teams: Team[]
    setTeams: (teams: Team[]) => void

    // UI State
    isLoading: boolean
    setIsLoading: (loading: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
    currentGame: null,
    setGame: (game) => set({ currentGame: game }),

    currentSeason: null,
    setSeason: (season) => set({ currentSeason: season }),

    teams: [],
    setTeams: (teams) => set({ teams }),

    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),
}))
