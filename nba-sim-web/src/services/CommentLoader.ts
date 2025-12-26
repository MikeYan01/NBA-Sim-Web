/**
 * Comment Loader Service
 *
 * Loads and manages commentary strings from external JSON files.
 * Provides random selection of comments for game events.
 */

import { Language } from '../models/types'
import { COMMENTS_PATH } from '../utils/Constants'
import { loadJSON } from './ResourceLoader'
import type { SeededRandom } from '../utils/SeededRandom'

// Type for nested comment objects
type CommentData = Record<string, unknown>

// Type for flattened comments by category (for viewer)
export type CommentsByCategory = Record<string, string[]>

// Cached comments for each language
let chineseComments: CommentData | null = null
let englishComments: CommentData | null = null

/**
 * Set comments directly (for testing purposes).
 * @param chinese Chinese comment data
 * @param english English comment data
 */
export function setCommentsForTesting(
    chinese: CommentData | null,
    english: CommentData | null
): void {
    chineseComments = chinese
    englishComments = english
}

/**
 * Initialize the comment loader.
 * Loads comment files for all languages.
 */
export async function initComments(): Promise<void> {
    const [chinese, english] = await Promise.all([
        loadJSON<CommentData>(`${COMMENTS_PATH}comments_zh_CN.json`),
        loadJSON<CommentData>(`${COMMENTS_PATH}comments_en_US.json`),
    ])

    chineseComments = chinese
    englishComments = english
}

/**
 * Check if comments are initialized.
 * @returns True if comments are loaded
 */
export function isInitialized(): boolean {
    return chineseComments !== null && englishComments !== null
}

/**
 * Get comments for a specific language.
 * @param language The language to get comments for
 * @returns The comment data object
 */
function getCommentsForLanguage(language: Language): CommentData | null {
    return language === Language.CHINESE ? chineseComments : englishComments
}

/**
 * Get a nested value from an object using dot notation.
 * @param obj The object to search
 * @param path Dot-separated path
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: CommentData, path: string): unknown {
    const keys = path.split('.')
    let current: unknown = obj

    for (const key of keys) {
        if (current === null || typeof current !== 'object') {
            return undefined
        }
        current = (current as Record<string, unknown>)[key]
    }

    return current
}

/**
 * Get a random comment from a category.
 * Uses the seeded random generator for reproducibility.
 *
 * @param category Dot-separated category path (e.g., 'jumpBall.win')
 * @param random Seeded random number generator
 * @param language Language to use
 * @returns A randomly selected comment, or empty string if not found
 */
export function getRandomComment(
    category: string,
    random: SeededRandom,
    language: Language
): string {
    const comments = getCommentsForLanguage(language)

    if (!comments) {
        // Only warn in development, not during tests
        if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
            console.warn('Comments not initialized. Call initComments() first.')
        }
        return ''
    }

    const value = getNestedValue(comments, category)

    if (Array.isArray(value) && value.length > 0) {
        const index = random.nextInt(value.length)
        const comment = value[index]
        return typeof comment === 'string' ? comment : ''
    }

    if (typeof value === 'string') {
        return value
    }

    // Only warn in development, not during tests
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
        console.warn(`Missing comment category: ${category}`)
    }
    return ''
}

/**
 * Get all comments from a category.
 * @param category Dot-separated category path
 * @param language Language to use
 * @returns Array of comments, or empty array if not found
 */
export function getAllComments(category: string, language: Language): string[] {
    const comments = getCommentsForLanguage(language)

    if (!comments) {
        return []
    }

    const value = getNestedValue(comments, category)

    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === 'string')
    }

    if (typeof value === 'string') {
        return [value]
    }

    return []
}

/**
 * Get a comment with placeholder replacement.
 * Replaces {player}, {team}, {distance}, etc. with provided values.
 *
 * @param category Dot-separated category path
 * @param random Seeded random number generator
 * @param language Language to use
 * @param replacements Key-value pairs for placeholder replacement
 * @returns The formatted comment
 */
export function getFormattedComment(
    category: string,
    random: SeededRandom,
    language: Language,
    replacements: Record<string, string | number>
): string {
    let comment = getRandomComment(category, random, language)

    for (const [key, value] of Object.entries(replacements)) {
        comment = comment.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
    }

    return comment
}

/**
 * Check if a comment category exists.
 * @param category Dot-separated category path
 * @param language Language to check
 * @returns True if the category exists
 */
export function hasCategory(category: string, language: Language): boolean {
    const comments = getCommentsForLanguage(language)

    if (!comments) {
        return false
    }

    const value = getNestedValue(comments, category)
    return value !== undefined
}

/**
 * Flatten nested comment data into a single-level object with dot-notation keys.
 * @param obj The nested object to flatten
 * @param prefix Current key prefix
 * @returns Flattened object with all string array values
 */
function flattenComments(obj: CommentData, prefix = ''): CommentsByCategory {
    const result: CommentsByCategory = {}

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key

        if (Array.isArray(value)) {
            // Filter to only string values
            const strings = value.filter((v): v is string => typeof v === 'string')
            if (strings.length > 0) {
                result[fullKey] = strings
            }
        } else if (value !== null && typeof value === 'object') {
            // Recursively flatten nested objects
            Object.assign(result, flattenComments(value as CommentData, fullKey))
        }
    }

    return result
}

/**
 * Load comments data for a specific language.
 * Returns a flattened structure for easy browsing.
 * @param language The language to load
 * @returns Flattened comments by category
 */
export async function loadComments(language: Language): Promise<CommentsByCategory> {
    const path =
        language === Language.CHINESE
            ? `${COMMENTS_PATH}comments_zh_CN.json`
            : `${COMMENTS_PATH}comments_en_US.json`

    const data = await loadJSON<CommentData>(path)
    return flattenComments(data)
}
