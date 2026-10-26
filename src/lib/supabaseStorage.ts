import { supabase } from './supabaseClient';

export interface StorageUploadResult {
  path: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Generic file uploader to any Supabase Storage bucket.
 * Generates a collision-resistant path while preserving original filename.
 */
export async function uploadFileToStorage(
  bucket: 'asset-documents' | 'invoices' | 'avatars' | string,
  file: File,
  folderPrefix?: string
): Promise<StorageUploadResult> {
  const fileExt = file.name.split('.').pop() || '';
  const sanitizedBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fileName = `${sanitizedBaseName}-${uniqueId}.${fileExt}`;
  const filePath = folderPrefix ? `${folderPrefix}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    url: publicUrlData.publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Upload an asset receipt, warranty card, invoice, or manual to 'asset-documents'
 */
export async function uploadAssetDocument(
  file: File,
  assetCodeOrId?: string
): Promise<StorageUploadResult> {
  const prefix = assetCodeOrId ? `assets/${assetCodeOrId}` : 'assets/general';
  return uploadFileToStorage('asset-documents', file, prefix);
}

/**
 * Upload a bill / recurring reminder receipt to 'invoices'
 */
export async function uploadInvoiceDocument(
  file: File,
  billId?: string | number
): Promise<StorageUploadResult> {
  const prefix = billId ? `bills/${billId}` : 'bills/incoming';
  return uploadFileToStorage('invoices', file, prefix);
}

/**
 * Upload an employee profile picture or avatar to 'avatars'
 */
export async function uploadEmployeeAvatar(
  file: File,
  employeeId?: string
): Promise<StorageUploadResult> {
  const prefix = employeeId ? `employees/${employeeId}` : 'employees/avatars';
  return uploadFileToStorage('avatars', file, prefix);
}

/**
 * Delete a file from a Supabase storage bucket
 */
export async function deleteStorageFile(
  bucket: string,
  pathOrUrl: string
): Promise<boolean> {
  try {
    let path = pathOrUrl;
    if (pathOrUrl.startsWith('http')) {
      const parts = pathOrUrl.split(`/${bucket}/`);
      if (parts.length > 1) {
        path = parts[1];
      }
    }
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.warn('Failed to delete file from storage:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Storage delete error:', err);
    return false;
  }
}
