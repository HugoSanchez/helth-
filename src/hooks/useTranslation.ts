import { useState } from 'react';
import { translations, Language } from '@/lib/translations';

type NestedValue<T, K extends string> = K extends `${infer First}.${infer Rest}`
    ? First extends keyof T
        ? T[First] extends object
            ? NestedValue<T[First], Rest>
            : never
        : never
    : K extends keyof T
        ? T[K]
        : never;

export function useTranslation(initialLanguage: Language = 'en') {
    const [language, setLanguage] = useState<Language>(initialLanguage);

    const t = <K extends keyof typeof translations.en>(key: K | string) => {
        try {
            const keys = key.split('.');
            let value: any = translations[language];

            for (const k of keys) {
                if (value === undefined || !(k in value)) {
                    throw new Error(`Translation not found for key: ${key}`);
                }
                value = value[k];
            }

            return value;
        } catch (error) {
            console.error('Translation error:', error);
            return key;
        }
    };

    return {
        t,
        language,
        setLanguage
    };
}
