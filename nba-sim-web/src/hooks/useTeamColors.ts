/**
 * useTeamColors Hook
 * Provides team-based color theming for components
 */

import { useMemo } from 'react';
import {
    getTeamColors,
    getTeamGradient,
    getTeamBadgeStyle,
    adjustColor,
    type TeamColors,
} from '../utils/teamColors';

export interface TeamColorTheme {
    colors: TeamColors;
    gradient: string;
    badgeStyle: React.CSSProperties;
    headerStyle: React.CSSProperties;
    cardStyle: React.CSSProperties;
    buttonStyle: React.CSSProperties;
    accentClasses: string;
}

/**
 * Hook to get team-specific styling
 * @param teamName - Name of the team (e.g., "Lakers", "Celtics")
 * @returns Object with various team-themed styles
 */
export function useTeamColors(teamName: string | undefined | null): TeamColorTheme | null {
    return useMemo(() => {
        if (!teamName) return null;

        const colors = getTeamColors(teamName);
        const gradient = getTeamGradient(teamName);
        const badgeStyle = getTeamBadgeStyle(teamName);

        // Header style for team-branded headers
        const headerStyle: React.CSSProperties = {
            background: gradient,
            color: colors.text,
        };

        // Card style for team-branded cards
        const cardStyle: React.CSSProperties = {
            borderColor: colors.primary,
            borderWidth: '2px',
            borderStyle: 'solid',
        };

        // Button style for team-branded buttons
        const buttonStyle: React.CSSProperties = {
            backgroundColor: colors.primary,
            color: colors.text,
            borderColor: colors.secondary,
        };

        // Generate utility classes based on color brightness
        const isLightPrimary = colors.text === '#000000';
        const accentClasses = isLightPrimary
            ? 'hover:bg-opacity-80'
            : 'hover:bg-opacity-90';

        return {
            colors,
            gradient,
            badgeStyle,
            headerStyle,
            cardStyle,
            buttonStyle,
            accentClasses,
        };
    }, [teamName]);
}

/**
 * Hook to get dual team theming (for matchups)
 * @param homeTeam - Home team name
 * @param awayTeam - Away team name
 * @returns Object with home and away team styling
 */
export function useMatchupColors(
    homeTeam: string | undefined | null,
    awayTeam: string | undefined | null
) {
    const homeColors = useTeamColors(homeTeam);
    const awayColors = useTeamColors(awayTeam);

    return useMemo(() => {
        if (!homeColors || !awayColors) {
            return null;
        }

        // Split gradient for matchup header
        const matchupGradient = `linear-gradient(to right, ${awayColors.colors.primary} 0%, ${awayColors.colors.primary} 45%, ${homeColors.colors.primary} 55%, ${homeColors.colors.primary} 100%)`;

        // Score display styles
        const homeScoreStyle: React.CSSProperties = {
            backgroundColor: homeColors.colors.primary,
            color: homeColors.colors.text,
        };

        const awayScoreStyle: React.CSSProperties = {
            backgroundColor: awayColors.colors.primary,
            color: awayColors.colors.text,
        };

        return {
            home: homeColors,
            away: awayColors,
            matchupGradient,
            homeScoreStyle,
            awayScoreStyle,
        };
    }, [homeColors, awayColors]);
}

/**
 * Hook for hover effects with team colors
 * @param teamName - Team name
 * @returns CSS variables object for hover effects
 */
export function useTeamHoverColors(teamName: string | undefined | null): React.CSSProperties {
    return useMemo(() => {
        if (!teamName) return {};

        const colors = getTeamColors(teamName);
        const lighterPrimary = adjustColor(colors.primary, 30);
        const darkerPrimary = adjustColor(colors.primary, -30);

        return {
            '--team-primary': colors.primary,
            '--team-primary-light': lighterPrimary,
            '--team-primary-dark': darkerPrimary,
            '--team-secondary': colors.secondary,
            '--team-text': colors.text,
        } as React.CSSProperties;
    }, [teamName]);
}
