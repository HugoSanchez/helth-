import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Stores a PDF file in Supabase storage
 *
 * @param userId - The ID of the user storing the file
 * @param fileName - The name of the file being stored
 * @param buffer - The file content as a Buffer
 * @returns The storage path of the saved file
 */
export async function storeDocument(userId: string, fileName: string, buffer: Buffer) {
    const timestamp = Date.now();
    const storagePath = `${userId}/${timestamp}_${fileName}`;

    const { error: uploadError } = await supabaseAdmin
        .storage
        .from('health_documents')
        .upload(storagePath, buffer, {
            upsert: false,
            contentType: 'application/pdf'
        });

    if (uploadError) {
        throw new Error(`Failed to store document: ${uploadError.message}`);
    }

    return storagePath;
}
