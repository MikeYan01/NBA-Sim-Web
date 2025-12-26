/**
 * Localization Service
 *
 * Provides localized strings for the application using key-path lookup.
 * Loads strings from JSON files in /data/localization/.
 */

import { Language } from '../models/types'
import { LOCALIZATION_PATH } from '../utils/Constants'
import { loadJSON } from './ResourceLoader'

// Type for nested string objects
type LocalizedStrings = Record<string, unknown>

// Cached localized strings
let chineseStrings: LocalizedStrings | null = null
let englishStrings: LocalizedStrings | null = null
let currentLanguage: Language = Language.ENGLISH

/**
 * Initialize the localization service.
 * Loads both language files into memory.
 */
export async function initLocalization(): Promise<void> {
    const [chinese, english] = await Promise.all([
        loadJSON<LocalizedStrings>(`${LOCALIZATION_PATH}strings_zh_CN.json`),
        loadJSON<LocalizedStrings>(`${LOCALIZATION_PATH}strings_en_US.json`),
    ])

    chineseStrings = chinese
    englishStrings = english
}

/**
 * Check if localization is initialized.
 * @returns True if strings are loaded
 */
export function isInitialized(): boolean {
    return chineseStrings !== null && englishStrings !== null
}

/**
 * Set the current language.
 * @param language The language to use
 */
export function setLanguage(language: Language): void {
    currentLanguage = language
}

/**
 * Get the current language.
 * @returns The current language
 */
export function getLanguage(): Language {
    return currentLanguage
}

/**
 * Get a localized string by key path.
 * Supports nested paths like 'game.overtime.suffix'.
 *
 * @param keyPath Dot-separated key path
 * @param language Optional language override (uses current language if not provided)
 * @returns The localized string, or the keyPath if not found
 */
export function getString(keyPath: string, language?: Language): string {
    const lang = language ?? currentLanguage
    const strings = lang === Language.CHINESE ? chineseStrings : englishStrings

    if (!strings) {
        // Only warn in development, not during tests
        if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
            console.warn('Localization not initialized. Call initLocalization() first.')
        }
        return keyPath
    }

    const value = getNestedValue(strings, keyPath)

    if (typeof value === 'string') {
        return value
    }

    // If value is an object with a default 'short' or 'long' key, return it
    if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>
        if (typeof obj.short === 'string') {
            return obj.short
        }
        if (typeof obj.long === 'string') {
            return obj.long
        }
    }

    console.warn(`Missing localization key: ${keyPath}`)
    return keyPath
}

/**
 * Get a localized string with the 'short' variant.
 * @param keyPath Dot-separated key path
 * @param language Optional language override
 * @returns The short variant of the localized string
 */
export function getStringShort(keyPath: string, language?: Language): string {
    return getString(`${keyPath}.short`, language)
}

/**
 * Get a localized string with the 'long' variant.
 * @param keyPath Dot-separated key path
 * @param language Optional language override
 * @returns The long variant of the localized string
 */
export function getStringLong(keyPath: string, language?: Language): string {
    return getString(`${keyPath}.long`, language)
}

/**
 * Get a nested value from an object using dot notation.
 * @param obj The object to search
 * @param path Dot-separated path
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: LocalizedStrings, path: string): unknown {
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
 * Format a string with placeholder replacement.
 * Replaces {0}, {1}, etc. with the provided values.
 *
 * @param template The template string with placeholders
 * @param values Values to substitute
 * @returns The formatted string
 */
export function formatString(template: string, ...values: (string | number)[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index) => {
        const i = parseInt(index, 10)
        return i < values.length ? String(values[i]) : match
    })
}

/**
 * Get a localized string and format it with values.
 * @param keyPath Dot-separated key path
 * @param values Values to substitute
 * @returns The formatted localized string
 */
export function getFormattedString(keyPath: string, ...values: (string | number)[]): string {
    const template = getString(keyPath)
    return formatString(template, ...values)
}

/**
 * Set localized strings directly for testing purposes.
 * This allows tests to provide mock data without loading from files.
 *
 * @param english English strings object
 * @param chinese Chinese strings object
 */
export function setStringsForTesting(
    english: LocalizedStrings,
    chinese: LocalizedStrings
): void {
    englishStrings = english
    chineseStrings = chinese
}
