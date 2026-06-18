import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

/**
 * Remove the photo file from disk if it exists.
 * Call after deleting a user record.
 */
export async function removePhotoValue(photoPath: string | null): Promise<void> {
  if (!photoPath) return;
  // ponytail: simple fs-based cleanup, no extra dependencies
  const fullPath = join(UPLOADS_DIR, photoPath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}