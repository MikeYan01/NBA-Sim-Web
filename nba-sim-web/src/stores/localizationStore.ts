import { create } from 'zustand'
import { Language } from '../models/types'
import * as LocalizationService from '../services/LocalizationService'

interface LocalizationState {
    language: Language
    isInitialized: boolean
    setLanguage: (lang: Language) => void
    init: () => Promise<void>
}

export const useLocalizationStore = create<LocalizationState>((set, get) => ({
    language: Language.CHINESE,
    isInitialized: false,

    setLanguage: (lang) => {
        LocalizationService.setLanguage(lang)
        set({ language: lang })
    },

    init: async () => {
        if (get().isInitialized) return
        await LocalizationService.initLocalization()
        set({ isInitialized: true })
    }
}))
