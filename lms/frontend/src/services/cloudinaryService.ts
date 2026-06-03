const CLOUD_NAME = 'dinanit0d';
const UPLOAD_PRESET = 'genesis_uploads';
const BASE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}`;

export const cloudinaryService = {
  async upload(file: File, folder = 'genesis', onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', folder);

    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200) {
            resolve({ url: data.secure_url, publicId: data.public_id });
          } else {
            reject(new Error(data.error?.message || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid response from Cloudinary'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },

  url(publicId: string, options?: { width?: number; height?: number; crop?: string; quality?: number }) {
    let base = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;
    if (options) {
      const params: string[] = [];
      if (options.width) params.push(`w_${options.width}`);
      if (options.height) params.push(`h_${options.height}`);
      if (options.crop) params.push(`c_${options.crop}`);
      if (options.quality) params.push(`q_${options.quality}`);
      if (params.length) base += `/${params.join(',')}`;
    }
    return `${base}/v1/${publicId}`;
  },

  async delete(publicId: string) {
    const response = await fetch('/api/upload/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicId }),
    });
    if (!response.ok) throw new Error('Delete failed');
    return response.json();
  },
};
