import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';

type SupportErrorReportUpdate =
  Database['public']['Tables']['support_tickets_error_reports']['Update'];

export async function uploadErrorReportScreenshot(
  file: File,
  ownerSegment: string
): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `reports/${ownerSegment}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('error-screenshots')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('error-screenshots').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Screenshot upload failed:', error);
    return null;
  }
}

export async function insertSupportErrorReport(row: {
  user_id: string | null;
  email: string;
  error_type: string;
  description: string;
  screenshot_url: string | null;
  page_url: string;
  user_agent: string;
  browser_info: Json;
}): Promise<void> {
  const { error } = await supabase
    .from('support_tickets_error_reports')
    .insert([row]);
  if (error) throw error;
}

export async function fetchSupportErrorReportsAll() {
  const { data, error } = await supabase
    .from('support_tickets_error_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateSupportErrorReport(
  reportId: string,
  patch: SupportErrorReportUpdate
) {
  const { error } = await supabase
    .from('support_tickets_error_reports')
    .update(patch)
    .eq('id', reportId);
  if (error) throw error;
}
