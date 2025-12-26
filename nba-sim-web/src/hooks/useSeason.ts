import { useGameStore } from '../stores/gameStore'
import { runSeason } from '../models/Season'
import { useLocalization } from './useLocalization'

export function useSeason() {
    const { currentSeason, setSeason, isLoading, setIsLoading } = useGameStore()
    const { language } = useLocalization()

    const simulateSeason = async (seed?: number) => {
        setIsLoading(true)
        setTimeout(async () => {
            try {
                const result = await runSeason({
                    seed,
                    language,
                    silentMode: true
                })
                setSeason(result)
            } catch (error) {
                console.error("Season simulation failed:", error)
            } finally {
                setIsLoading(false)
            }
        }, 0)
    }

    return { currentSeason, simulateSeason, isLoading }
}
