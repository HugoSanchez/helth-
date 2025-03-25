import { useState, useCallback } from 'react';
import { translations, Language } from '@/lib/translations';

export function useTranslation(initialLanguage: Language = 'en') {
    const [language, setLanguage] = useState<Language>(initialLanguage);

    const t = useCallback((key: string) => {
        const keys = key.split('.');
        let value: any = translations[language];

        for (const k of keys) {
            value = value?.[k];
        }

        return value || key;
    }, [language]);

    return {
        t,
        language,
        setLanguage
    };
}
