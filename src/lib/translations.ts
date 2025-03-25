export const translations = {
    en: {
        setup: {
            welcome: "Welcome to helth.",
            description: "Before continuing, let's get to know you better. Please provide your name and preferred language.",
            nameLabel: "What's your name?",
            languageLabel: "Choose your language",
            continue: "Continue",
            settingUp: "Setting up..."
        },
        languages: {
            english: "English",
            spanish: "Spanish"
        }
    },
    es: {
        setup: {
            welcome: "Bienvenido a helth.",
            description: "Antes de continuar, nos gustaría conocerte mejor. Por favor, proporciona tu nombre e idioma preferido.",
            nameLabel: "¿Cómo te llamas?",
            languageLabel: "Elige tu idioma",
            continue: "Continuar",
            settingUp: "Configurando..."
        },
        languages: {
            english: "Inglés",
            spanish: "Español"
        }
    }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
