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
            const keys = key.split('.');
            let value: any = translations[language];

            for (const k of keys) {
                if (value === undefined || !(k in value)) {
                    throw new Error(`Translation not found for key: ${key}`);
                }
                value = value[k];
            }

            if (typeof value === 'string') {
                return value;
            }

            throw new Error(`Invalid translation value for key: ${key}`);
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
