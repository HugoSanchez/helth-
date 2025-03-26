import { supabaseAdmin } from '@/lib/server/supabase';

export async function storeDocument(userId: string, content: string, metadata: any) {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert([
        {
          user_id: userId,
          content,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error storing document:', error);
    throw error;
  }
}
