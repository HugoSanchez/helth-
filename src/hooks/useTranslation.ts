import { useState } from 'react';
import { translations, Language } from '@/lib/translations';

type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`
}[keyof ObjectType & (string | number)]

type TranslationKey = NestedKeyOf<typeof translations.en>

export function useTranslation(initialLanguage: Language = 'en') {
    const [language, setLanguage] = useState<Language>(initialLanguage);

    const t = (key: TranslationKey) => {
        try {
            // Split the key by dots to handle nested paths
            const keys = key.split('.') as (keyof typeof translations.en)[];
            let value: any = translations[language];

            // Traverse the nested object
            for (const k of keys) {
                value = value[k];
            }

            // If the value is an object with language keys, return the correct language
            if (value && typeof value === 'object' && language in value) {
                return value[language];
            }

            return value;
        } catch (error) {
            console.error(`Translation key not found: ${key}`);
            // Return the key as fallback
            return key;
        }
    };

    return {
        t,
        language,
        setLanguage
    };
}
