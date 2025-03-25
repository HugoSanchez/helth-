export const translations = {
    en: {
        common: {
            loading: "Loading..."
        },
        setup: {
            welcome: "Welcome to helth.",
            description: "Before continuing, let's get to know you better. Please provide your name and preferred language.",
            nameLabel: "What's your name?",
            languageLabel: "Choose your language",
            continue: "Continue",
            settingUp: "Setting up..."
        },
        dashboard: {
            welcome: "Hi, {name}!",
            description: "This will be your Dashboard. Start by scanning your emails for medical documents or you can upload your first document.",
            scanButton: "Scan Medical Documents",
            uploadButton: "Upload your first document",
            processing: "Processing...",
            or: "- or -",
            connectGmail: "Connect Gmail to get started"
        },
        languages: {
            english: "English",
            spanish: "Spanish"
        }
    },
    es: {
        common: {
            loading: "Cargando..."
        },
        setup: {
            welcome: "Bienvenido a helth.",
            description: "Antes de continuar, nos gustaría conocerte mejor. Por favor, proporciona tu nombre e idioma preferido.",
            nameLabel: "¿Cómo te llamas?",
            languageLabel: "Elige tu idioma",
            continue: "Continuar",
            settingUp: "Configurando..."
        },
        dashboard: {
            welcome: "¡Hola, {name}!",
            description: "Este será tu Panel de Control. Comienza escaneando tus correos electrónicos en busca de documentos médicos o puedes subir tu primer documento.",
            scanButton: "Escanear Documentos Médicos",
            uploadButton: "Sube tu primer documento",
            processing: "Procesando...",
            or: "- o -",
            connectGmail: "Conecta Gmail para comenzar"
        },
        languages: {
            english: "Inglés",
            spanish: "Español"
        }
    }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
