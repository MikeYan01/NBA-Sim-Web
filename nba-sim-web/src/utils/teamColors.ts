/**
 * Team Colors Configuration
 * Official NBA team colors for theming support
 */

export interface TeamColors {
    primary: string;
    secondary: string;
    accent?: string;
    text: string; // Best contrasting text color for primary
}

/**
 * Official NBA team colors
 * Primary: Main team color
 * Secondary: Accent/alternate color
 * Text: Best readable text color on primary background
 */
export const TEAM_COLORS: Record<string, TeamColors> = {
    // Eastern Conference - Atlantic Division
    '76ers': { primary: '#006BB6', secondary: '#ED174C', text: '#FFFFFF' },
    Celtics: { primary: '#007A33', secondary: '#BA9653', text: '#FFFFFF' },
    Nets: { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
    Knicks: { primary: '#F58426', secondary: '#006BB6', text: '#FFFFFF' },
    Raptors: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },

    // Eastern Conference - Central Division
    Bulls: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
    Cavaliers: { primary: '#6F263D', secondary: '#FFB81C', text: '#FFFFFF' },
    Pacers: { primary: '#002D62', secondary: '#FDBB30', text: '#FFFFFF' },
    Pistons: { primary: '#C8102E', secondary: '#1D42BA', text: '#FFFFFF' },
    Bucks: { primary: '#00471B', secondary: '#EEE1C6', text: '#FFFFFF' },

    // Eastern Conference - Southeast Division
    Hawks: { primary: '#E03A3E', secondary: '#C1D32F', text: '#FFFFFF' },
    Heat: { primary: '#98002E', secondary: '#F9A01B', text: '#FFFFFF' },
    Hornets: { primary: '#1D1160', secondary: '#00788C', text: '#FFFFFF' },
    Magic: { primary: '#0077C0', secondary: '#000000', text: '#FFFFFF' },
    Wizards: { primary: '#002B5C', secondary: '#E31837', text: '#FFFFFF' },

    // Western Conference - Northwest Division
    Nuggets: { primary: '#0E2240', secondary: '#FEC524', text: '#FFFFFF' },
    Jazz: { primary: '#002B5C', secondary: '#F9A01B', text: '#FFFFFF' },
    'Trail Blazers': { primary: '#E03A3E', secondary: '#000000', text: '#FFFFFF' },
    Timberwolves: { primary: '#0C2340', secondary: '#78BE20', text: '#FFFFFF' },
    Thunder: { primary: '#007AC1', secondary: '#EF3B24', text: '#FFFFFF' },

    // Western Conference - Pacific Division
    Warriors: { primary: '#1D428A', secondary: '#FFC72C', text: '#FFFFFF' },
    Clippers: { primary: '#C8102E', secondary: '#1D428A', text: '#FFFFFF' },
    Lakers: { primary: '#552583', secondary: '#FDB927', text: '#FFFFFF' },
    Suns: { primary: '#1D1160', secondary: '#E56020', text: '#FFFFFF' },
    Kings: { primary: '#5A2D81', secondary: '#63727A', text: '#FFFFFF' },

    // Western Conference - Southwest Division
    Mavericks: { primary: '#00538C', secondary: '#002B5E', text: '#FFFFFF' },
    Rockets: { primary: '#CE1141', secondary: '#000000', text: '#FFFFFF' },
    Spurs: { primary: '#C4CED4', secondary: '#000000', text: '#000000' },
    Grizzlies: { primary: '#5D76A9', secondary: '#12173F', text: '#FFFFFF' },
    Pelicans: { primary: '#0C2340', secondary: '#C8102E', text: '#FFFFFF' },
};

/**
 * Get team colors with fallback
 */
export function getTeamColors(teamName: string): TeamColors {
    // Try direct match
    if (TEAM_COLORS[teamName]) {
        return TEAM_COLORS[teamName];
    }

    // Try to find partial match
    const normalizedName = teamName.toLowerCase();
    for (const [key, colors] of Object.entries(TEAM_COLORS)) {
        if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(key.toLowerCase())) {
            return colors;
        }
    }

    // Default neutral colors
    return { primary: '#1F2937', secondary: '#4B5563', text: '#FFFFFF' };
}

/**
 * Generate CSS custom properties for team theming
 */
export function getTeamCSSVariables(teamName: string): Record<string, string> {
    const colors = getTeamColors(teamName);
    return {
        '--team-primary': colors.primary,
        '--team-secondary': colors.secondary,
        '--team-accent': colors.accent || colors.secondary,
        '--team-text': colors.text,
    };
}

/**
 * Generate Tailwind-compatible inline styles for team theming
 */
export function getTeamStyles(teamName: string): React.CSSProperties {
    const vars = getTeamCSSVariables(teamName);
    return vars as unknown as React.CSSProperties;
}

/**
 * Get contrasting text color for a background
 */
export function getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Lighten or darken a hex color
 */
export function adjustColor(hexColor: string, amount: number): string {
    const hex = hexColor.replace('#', '');

    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generate a gradient from team colors
 */
export function getTeamGradient(teamName: string, direction = 'to right'): string {
    const colors = getTeamColors(teamName);
    return `linear-gradient(${direction}, ${colors.primary}, ${colors.secondary})`;
}

/**
 * Get team avatar/badge background style
 */
export function getTeamBadgeStyle(teamName: string): React.CSSProperties {
    const colors = getTeamColors(teamName);
    return {
        backgroundColor: colors.primary,
        color: colors.text,
        borderColor: colors.secondary,
        borderWidth: '2px',
        borderStyle: 'solid',
    };
}
