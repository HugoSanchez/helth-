import { supabaseAdmin } from '@/lib/server/supabase';
import { DocumentAnalysis } from './anthropic';

export async function storeDocument(
	userId: string,
	fileName: string,
	fileBuffer: Buffer,
	analysis?: DocumentAnalysis
) {
	try {
		// Only proceed if analysis was successful
		if (analysis?.status === 'error') {
			throw new Error(analysis.error_message || 'Analysis failed');
		}

		// Sanitize the filename by:
		// 1. Removing accents/diacritics
		// 2. Converting to lowercase
		// 3. Replacing spaces and special chars with hyphens
		// 4. Ensuring .pdf extension
		const sanitizeFilename = (name: string): string => {
			return name
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '') // Remove accents/diacritics
				.toLowerCase()
				.replace(/[^a-z0-9.]/g, '-') // Replace special chars with hyphens
				.replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
				.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
		};

		// Generate sanitized filename while preserving the original for display
		const originalName = analysis?.record_name || fileName;
		const sanitizedName = sanitizeFilename(originalName);

		// First, store the file in storage with sanitized name
		const filePath = `${userId}/${sanitizedName}`;
		console.log('[DB] Attempting to store file at path:', filePath);

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

		// Then create the record in the database
		const { data: record, error: dbError } = await supabaseAdmin
			.from('health_records')
			.insert([
				{
					user_id: userId,
					record_name: originalName, // Store original name for reference
					display_name: analysis?.display_name || analysis?.record_name || fileName,
					record_type: analysis?.record_type || 'other',
					record_subtype: analysis?.record_subtype || null,
					doctor_name: analysis?.doctor_name || null,
					date: analysis?.date || null,
					summary: analysis?.summary || null,
					file_url: filePath, // Store the sanitized path
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
