We're building a simple way for people to have control over their medical records. We're using AI to make it easier for them to clasify the documents.

We're using Next.js, Shadcn, Lucide, Supabase.

We're using Nextjs 14 App Router.

We're using Anthropic for the AI part.

Here some of our tables and schemas:

user_preferences:

- id: string; // uuid, primary key
- user_id: string; // uuid, nullable
- display_name: string; // text, nullable
- language: string; // enum ('en' default), supported languages
- onboarding_completed: boolean; // boolean, default false
- created_at: Date; // timestamp, default now()
- updated_at: Date; // timestamp, default now()

health_records:

- id: string; // uuid, primary key, default: uuid_generate_v4()
- user_id: string; // uuid, nullable
- record_name: string; // text, nullable
- record_type: string; // text, nullable
- summary: string; // text, nullable
- doctor_name: string; // text, nullable
- date: Date; // timestamp, nullable
- email_id: string; // text, nullable
- file_url: string; // text, nullable
- is_processed: boolean; // boolean, default: false
- created_at: Date; // timestamp, default: now()
- updated_at: Date; // timestamp, default: now()

We also have a storage bucket for the documents called "health_documents".
health_documents:
