const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

function cloudinaryUpload(
  file: File,
  folder: string,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; path: string }> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);
  if (folder) form.append('folder', folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        resolve({ url: data.secure_url, path: data.public_id });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error?.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(form);
  });
}

export const storageService = {
  async uploadFile(path: string, file: File, onProgress?: (pct: number) => void) {
    const result = await cloudinaryUpload(file, path, onProgress);
    return result;
  },

  async uploadBytes(path: string, data: Blob | Uint8Array | ArrayBuffer) {
    const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
    const file = new File([blob], 'upload.bin');
    return cloudinaryUpload(file, path);
  },

  async getDownloadUrl(publicId: string) {
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
  },

  async deleteFile(publicId: string) {
    const { default: api } = await import('./api');
    await api.post('/upload/delete', { publicId });
  },

  async listFiles(_path: string) {
    throw new Error('Cloudinary listFiles is not supported via client-side API');
  },
};
