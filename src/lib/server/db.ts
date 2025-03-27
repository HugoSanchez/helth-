import { supabaseAdmin } from '@/lib/server/supabase';

interface DocumentAnalysis {
	summary?: string;
	type?: string;
	doctor_name?: string;
	date?: string;
}

export async function storeDocument(
	userId: string,
	fileName: string,
	fileBuffer: Buffer,
	analysis?: DocumentAnalysis
) {
	try {
		console.log('[DB] Starting document storage...');
		console.log('[DB] Uploading file to storage:', fileName);

		// First, store the file in storage
		const filePath = `${userId}/${fileName}`;
		const { data: fileData, error: uploadError } = await supabaseAdmin
			.storage
			.from('health_documents')
			.upload(filePath, fileBuffer, {
				contentType: 'application/pdf',
				upsert: true
			});

		if (uploadError) {
			console.error('[DB] File upload error:', uploadError);
			throw uploadError;
		}

		// Get the public URL for the file
		const { data: { publicUrl } } = supabaseAdmin
			.storage
			.from('health_documents')
			.getPublicUrl(filePath);

		console.log('[DB] File uploaded successfully, creating database record');

		// Then create the record in the database
		const { data: record, error: dbError } = await supabaseAdmin
			.from('health_records')
			.insert([
				{
					user_id: userId,
					record_name: fileName,
					record_type: analysis?.type || 'other',
					doctor_name: analysis?.doctor_name || 'Unknown',
					date: analysis?.date || 'Unknown',
					summary: analysis?.summary || 'Unknown',
					file_url: publicUrl,
					is_processed: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString()
				},
			])
			.select()
			.single();

		if (dbError) {
			console.error('[DB] Database error:', dbError);
			throw dbError;
		}

		console.log('[DB] Document stored successfully');
		return record;
	} catch (error) {
		console.error('[DB] Error storing document:', error);
		throw error;
	}
}
