import { supabaseAdmin } from '@/lib/server/supabase';

interface DocumentAnalysis {
	summary?: string;
	type?: string;
	record_subtype?: string;
	doctor_name?: string;
	date?: string;
	record_name?: string;
}

export async function storeDocument(
	userId: string,
	fileName: string,
	fileBuffer: Buffer,
	analysis?: DocumentAnalysis
) {
	try {
		// First, store the file in storage
		const filePath = `${userId}/${fileName}`;
		const { data: fileData, error: uploadError } = await supabaseAdmin
			.storage
			.from('health_records')
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
			.from('health_records')
			.getPublicUrl(filePath);

		// Then create the record in the database
		const { data: record, error: dbError } = await supabaseAdmin
			.from('health_records')
			.insert([
				{
					user_id: userId,
					record_name: analysis?.record_name || fileName,
					record_type: analysis?.type || 'other',
					record_subtype: analysis?.record_subtype || null,
					doctor_name: analysis?.doctor_name || null,
					date: analysis?.date || null,
					summary: analysis?.summary || null,
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
