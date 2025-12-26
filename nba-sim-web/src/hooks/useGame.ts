import { useGameStore } from '../stores/gameStore'
import { hostGame } from '../models/Game'
import { Team } from '../models/Team'
import { SeededRandom } from '../utils/SeededRandom'
import { useLocalization } from './useLocalization'
import { initGameEngine } from '../services/GameEngine'

export function useGame() {
    const { currentGame, setGame, isLoading, setIsLoading } = useGameStore()
    const { language } = useLocalization()

    const simulateGame = async (team1: Team, team2: Team, seed?: number) => {
        setIsLoading(true)
        try {
            // Ensure game engine (comments, localization) is initialized
            await initGameEngine()

            const random = new SeededRandom(seed ?? Date.now())
            const result = hostGame(team1, team2, random, language)
            setGame(result)
        } catch (error) {
            console.error("Game simulation failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return { currentGame, simulateGame, isLoading }
}
