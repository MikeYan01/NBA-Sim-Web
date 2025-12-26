import { useLocalizationStore } from '../stores/localizationStore'
import * as LocalizationService from '../services/LocalizationService'

export function useLocalization() {
    const { language, setLanguage, isInitialized, init } = useLocalizationStore()

    const t = (key: string) => LocalizationService.getString(key, language)

    return { language, setLanguage, t, isInitialized, init }
}
