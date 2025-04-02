export const translations = {
    en: {
        common: {
            loading: "Loading...",
            next: "Next",
            back: "Back",
            skip: "Skip",
            continue: "Continue",
            upload: "Upload",
            browse: "Browse Files",
            or: "or"
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
                ready: "Upload a file"
            },
            connect: {
                title: "Connect your Gmail",
                description: "Connect your Gmail account to let helth automatically scan your inbox for medical documents. This is an optional step.",
                skipDescription: "You can always connect your Gmail account later from your dashboard.",
                whyConnect: "Why connect Gmail?",
                benefits: {
                    title: "Benefits of connecting your Gmail:",
                    items: [
                        "Save time by avoiding manual uploads",
                        "Don't miss important medical information",
						"Automatically find medical documents in your inbox",
                        "Secure and private - we only access medical-related emails and we only store the documents you asks us to keep"
                    ]
                }
            },
			upload:{
				title: "Upload your first file",
				description: "Lets upload your first file. Remember we only support PDF files for now."
			},
        },
        dashboard: {
            greeting: "Hi {name},",
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
        },
        documents: {
            title: "Your documents",
            emptyState: {
                title: "Start by uploading your first document",
                message: "Upload your first document"
            },
            description: "From most recent to oldest",
            table: {
                selectAll: "Select all",
                selectDocument: "Select {name}",
                summary: "Summary",
                name: "Name",
                type: "Type",
                doctor: "Doctor",
                date: "Date",
                actions: "Actions",
                noDoctorSpecified: "No doctor specified",
                noDate: "No date",
                viewDocument: "View document",
                download: "Download",
                share: "Share",
                edit: "Edit"
            },
            edit: {
                title: "Edit document details",
                save: "Save changes",
                cancel: "Cancel",
                loading: "Updating document...",
                success: "Document updated successfully",
                error: "Failed to update document"
            },
            types: {
                lab_report: "Lab Report",
                prescription: "Prescription",
                imaging: "Imaging",
                clinical_notes: "Clinical Notes",
                other: "Other"
            },
            upload: {
                loading: "Uploading document...",
                success: "Document uploaded successfully",
                error: "Failed to upload document"
            },
            delete: {
                loading: "Deleting documents...",
                success: "Documents deleted successfully",
                error: "Failed to delete documents"
            },
            view: {
                error: "Failed to open document"
            },
            download: {
                error: "Failed to download document"
            }
        },
        fileUpload: {
            dragDrop: "Click to upload or drag and drop",
            fileSize: "PDF (up to 10MB)",
            errors: {
                pdfOnly: "Please upload a PDF file",
                tooLarge: "File is too large. Maximum size is 10MB"
            }
        }
    },
    es: {
        common: {
            loading: "Loading...",
            next: "Siguiente",
            back: "Atrás",
            skip: "Omitir este paso",
            continue: "Continuar",
            upload: "Subir archivo",
            browse: "Explorar Archivos",
            or: "o"
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
                ready: "Sube un archivo"
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
            },
			upload:{
				title: "Sube tu primer archivo",
				description: "Prueba a subir un primer archivo. Recuerda que solo aceptamos el formato PDF por el momento."
			},
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
        },
        documents: {
            title: "Tus documentos",
            emptyState: {
                title: "Comienza subiendo tu primer documento",
                message: "Sube tu primer documento"
            },
            description: "Del más reciente al más antiguo",
            table: {
                selectAll: "Seleccionar todo",
                selectDocument: "Seleccionar {name}",
                summary: "Resumen",
                name: "Nombre",
                type: "Tipo",
                doctor: "Doctor",
                date: "Fecha",
                actions: "Acciones",
                noDoctorSpecified: "Doctor no especificado",
                noDate: "Sin fecha",
                viewDocument: "Ver documento",
                download: "Descargar",
                share: "Compartir",
                edit: "Editar"
            },
            edit: {
                title: "Editar detalles del documento",
                save: "Guardar cambios",
                cancel: "Cancelar",
                loading: "Actualizando documento...",
                success: "Documento actualizado exitosamente",
                error: "Error al actualizar el documento"
            },
            types: {
                lab_report: "Informe de Laboratorio",
                prescription: "Receta",
                imaging: "Imagen Médica",
                clinical_notes: "Notas Clínicas",
                other: "Otro"
            },
            upload: {
                loading: "Subiendo documento...",
                success: "Documento subido exitosamente",
                error: "Error al subir el documento"
            },
            delete: {
                loading: "Eliminando documentos...",
                success: "Documentos eliminados exitosamente",
                error: "Error al eliminar documentos"
            },
            view: {
                error: "Error al abrir el documento"
            },
            download: {
                error: "Error al descargar el documento"
            }
        },
        fileUpload: {
            dragDrop: "Haz clic para subir o arrastra y suelta",
            fileSize: "PDF (hasta 10MB)",
            errors: {
                pdfOnly: "Por favor, sube un archivo PDF",
                tooLarge: "El archivo es demasiado grande. El tamaño máximo es 10MB"
            }
        }
    }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
