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

## SHARING RECORDS

How we're thinking about sharing records for the moment. Database tables:

1. shared_collection

   - id (uuid) -- Unique identifier for the share link
   - owner_id -- User who created the share
   - created_at -- When the share was created
   - expires_at -- [REMOVED based on your requirements]
   - access_count -- How many times it's been accessed
   - is_active -- Whether the share is still valid
   - is_accessed -- Whether it's been accessed (since we only allow one access)

2. shared_collection_documents

   - collection_id -- References shared_collections.id
   - document_id -- References health_records.id

3. shared_collection_access
   - collection_id -- References shared_collections.id
   - accessed_by_user_id -- Who accessed the share
   - accessed_at -- When it was accessed

shared_collection:

    - When User A selects documents and clicks "Share", we create one record here
    - This generates a unique ID that becomes part of the share link
    - We track if it's been accessed (since you want one-time access only)
    - We keep is_active for future revocation feature

shared_collection_documents:

    - Links documents to a share collection
    - If User A shares 3 documents, we create 3 records here
    - 	All with the same collection_id but different document_id
    - This allows sharing multiple documents with one link

shared_collection_access:

    - When User B accesses the share, we record it here
    - Tracks who accessed it and when
    - Useful for audit trail and future notifications
