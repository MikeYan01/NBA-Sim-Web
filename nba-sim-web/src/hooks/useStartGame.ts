import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Team } from '../models/Team'
import { useGame } from './useGame'

export function useStartGame() {
    const { simulateGame, isLoading: isSimulating } = useGame()
    const navigate = useNavigate()
    const [isStarting, setIsStarting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const pending = useRef(false)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
    }, [])

    const startGame = async (awayTeamName: string, homeTeamName: string) => {
        if (pending.current || isSimulating) return
        pending.current = true
        setIsStarting(true)
        setError(null)

        try {
            const [awayTeam, homeTeam] = await Promise.all([
                Team.loadFromCSV(awayTeamName),
                Team.loadFromCSV(homeTeamName),
            ])
            if (!mounted.current) return

            await simulateGame(awayTeam, homeTeam)
            if (mounted.current) navigate('/game')
        } catch (cause: unknown) {
            console.error('Failed to start game:', cause)
            if (mounted.current) {
                setError(cause instanceof Error ? cause.message : String(cause))
            }
        } finally {
            pending.current = false
            if (mounted.current) setIsStarting(false)
        }
    }

    return { startGame, isLoading: isStarting || isSimulating, error }
}
