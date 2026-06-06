import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from '@/firebase/config';

/** Firebase Storage service for file upload, download, and management. */
export const storageService = {
  /** Upload a file to Firebase Storage at the given path with progress tracking. */
  async uploadFile(path: string, file: File, onProgress?: (progress: number) => void) {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<{ url: string; path: string }>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, path });
        },
      );
    });
  },

  /** Upload raw bytes (Blob/Uint8Array/ArrayBuffer) to Firebase Storage at the given path. */
  async uploadBytes(path: string, data: Blob | Uint8Array | ArrayBuffer) {
    const storageRef = ref(storage, path);
    const result = await uploadBytes(storageRef, data);
    const url = await getDownloadURL(result.ref);
    return { url, path: result.ref.fullPath };
  },

  /** Get a download URL for a file at the given storage path. */
  async getDownloadUrl(path: string) {
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  },

  /** Delete a file from Firebase Storage at the given path. */
  async deleteFile(path: string) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  },

  /** List all items (files) at a given storage path prefix. */
  async listFiles(path: string) {
    const storageRef = ref(storage, path);
    const result = await listAll(storageRef);
    return result.items;
  },
};
