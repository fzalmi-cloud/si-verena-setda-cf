// ============================================
// R2 Storage Helpers
// ============================================

export interface UploadResult {
  file_url: string;
  file_key: string;
  nama_file: string;
  file_size: number;
}

export async function uploadToR2(
  R2: R2Bucket,
  file: File,
  folder: string = 'dokumen'
): Promise<UploadResult> {
  const key = `${folder}/${crypto.randomUUID()}/${file.name}`;
  
  await R2.put(key, file, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `attachment; filename="${file.name}"`,
    },
  });

  return {
    file_url: `/api/files/${key}`,
    file_key: key,
    nama_file: file.name,
    file_size: file.size,
  };
}

export async function getFromR2(R2: R2Bucket, key: string) {
  return await R2.get(key);
}

export async function deleteFromR2(R2: R2Bucket, key: string) {
  await R2.delete(key);
}

export async function listR2Objects(
  R2: R2Bucket,
  prefix: string,
  limit: number = 100
) {
  return await R2.list({ prefix, limit });
}
