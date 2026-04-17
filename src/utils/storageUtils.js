import { supabase } from "../lib/supabase";

/**
 * Uploads a file to Supabase storage and returns the public URL.
 * @param {File} file - The file object to upload.
 * @param {string} type - File type (currently not used in path but useful for logic).
 * @param {string} bucket - The Supabase storage bucket name.
 * @returns {Promise<{url: string}>} - An object containing the public URL.
 */
export const uploadFileToStorage = async (file, type, bucket = "image_bucket") => {
  if (!file) return { url: "" };

  const fileExt = file.name.split(".").pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    console.error("Storage upload error:", error);
    throw error;
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return { url: data.publicUrl };
};
