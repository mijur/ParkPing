import supabase from '../utils/supabase';

const STORAGE_BUCKET = 'parking-documents'; // You can change this bucket name

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param path - The path within the bucket (e.g., 'spot-images/123.jpg')
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (
  file: File,
  path: string
): Promise<{ url: string; error: null } | { url: null; error: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return { url: urlData.publicUrl, error: null };
  } catch (error: any) {
    return { url: null, error: error.message || 'Failed to upload file' };
  }
};

/**
 * Delete a file from Supabase Storage
 * @param path - The path of the file to delete
 */
export const deleteFile = async (path: string): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete file' };
  }
};

/**
 * Get a public URL for a file
 * @param path - The path of the file
 * @returns The public URL
 */
export const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

/**
 * List files in a folder
 * @param folder - The folder path (e.g., 'spot-images/')
 * @returns Array of file paths
 */
export const listFiles = async (folder: string = ''): Promise<{ files: string[]; error: string | null }> => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folder);

    if (error) {
      return { files: [], error: error.message };
    }

    const filePaths = (data || [])
      .filter(item => item.name) // Filter out folders
      .map(item => folder ? `${folder}/${item.name}` : item.name);

    return { files: filePaths, error: null };
  } catch (error: any) {
    return { files: [], error: error.message || 'Failed to list files' };
  }
};

