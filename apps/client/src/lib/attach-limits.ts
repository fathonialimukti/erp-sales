/** Max upload size for user-attached images (5 MB), shared across chat + email compose. */
export const MAX_IMAGE_ATTACH_BYTES = 5 * 1024 * 1024;

/**
 * Accepts only image files at or under the attachment size limit.
 * Callers surface their own "skipped N files" message (copy differs per surface).
 */
export const isAcceptableImage = (file: File): boolean =>
  file.type.startsWith("image/") && file.size <= MAX_IMAGE_ATTACH_BYTES;
