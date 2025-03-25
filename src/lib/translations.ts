export const translations = {
    en: {
        common: {
            loading: "Loading...",
            next: "Next",
            back: "Back",
            skip: "Skip",
            continue: "Continue"
        },
        setup: {
            welcome: "Welcome to helth.",
            description: "Before continuing, let's get you set up. Please provide your name and preferred language.",
            nameLabel: "What's your name?",
            languageLabel: "Choose your language",
            continue: "Continue",
            settingUp: "Setting up...",
            steps: {
                preferences: "Preferences",
                connect: "Connect Gmail",
                ready: "Ready!"
            },
            connect: {
                title: "Connect your Gmail",
                description: "Connect your Gmail account to let helth automatically scan your inbox for medical documents. This is an optional step.",
                skipDescription: "You can always connect your Gmail account later from your dashboard.",
                whyConnect: "Why connect Gmail?",
                benefits: {
                    title: "Benefits of connecting your Gmail:",
                    items: [
                        "Automatically find medical documents in your inbox",
                        "Save time by avoiding manual uploads",
                        "Never miss important medical information",
                        "Secure and private - we only access medical-related emails"
                    ]
                }
            }
        },
        dashboard: {
            greetinf: "Hi {name},",
			thisIsYourDashboard: "this is your dashboard",
            description: "This will be your Dashboard. Start by scanning your emails for medical documents or you can upload your first document.",
            scanButton: "Scan Medical Documents",
            uploadButton: "Upload document",
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
            loading: "Loading...",
            next: "Siguiente",
            back: "Atrás",
            skip: "Omitir este paso",
            continue: "Continuar"
        },
        setup: {
            welcome: "Bienvenido a helth.",
            description: "Antes de continuar, vamos a configurar tu cuenta. Por favor, proporciona tu nombre e idioma preferido.",
            nameLabel: "¿Cómo te llamas?",
            languageLabel: "Elige tu idioma",
            continue: "Continuar",
            settingUp: "Configurando...",
            steps: {
                preferences: "Preferencias",
                connect: "Conecta Gmail",
                ready: "¡Listo!"
            },
            connect: {
                title: "Conecta tu Gmail",
                description: "Conecta tu cuenta de Gmail si quieres que helth escanee tu correo para extraer tus documentos médicos por ti. Este es un paso opcional.",
                skipDescription: "Siempre puedes conectar tu cuenta de Gmail más tarde desde tu panel de control.",
                whyConnect: "¿Por qué conectar Gmail?",
                benefits: {
                    title: "Beneficios de conectar tu Gmail y cómo funciona:",
                    items: [
						"Solo accedemos a tus correos una vez",
						"No guardamos ni tus correos ni tus credenciales",
						"Encuentramos automáticamente documentos médicos en tu bandeja de entrada sin que tengas que hacer nada.",
                    ]
                }
            }
        },
        dashboard: {
            greeting: "Hola {name},",
			thisIsYourDashboard: "este es tu Dashboard.",
            description: "Este será tu Panel de Control. Comienza escaneando tus correos electrónicos en busca de documentos médicos o puedes subir tu primer documento.",
            scanButton: "Conectar Gmail y Escanear",
            uploadButton: "Sube un documento",
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
