/**
 * Gets a photo ready to be read, and shrinks it for keeping. Everything
 * happens on a canvas in this browser.
 *
 * A phone photo of a receipt is usually far larger than it needs to be,
 * unevenly lit, and in colour. The reader does better with a grey picture of
 * moderate size whose darks and lights have been pulled apart.
 */

/** Long side, in pixels, that the reader gets. */
const READ_MAX = 2400;
const READ_MIN = 1200;
/** Long side, in pixels, of the copy that is kept on the device. */
const KEEP_MAX = 1800;

/**
 * Turns RGBA pixels grey and stretches the contrast, in place. The darkest
 * and lightest two in a hundred pixels are ignored, so one glare spot or one
 * black edge does not flatten the rest.
 */
export function stretchContrast(pixels: Uint8ClampedArray): void {
  const count = pixels.length / 4;
  if (count === 0) return;
  const histogram = new Uint32Array(256);
  const grey = new Uint8Array(count);
  for (let index = 0; index < count; index += 1) {
    const at = index * 4;
    const value = Math.round(0.299 * pixels[at] + 0.587 * pixels[at + 1] + 0.114 * pixels[at + 2]);
    grey[index] = value;
    histogram[value] += 1;
  }
  const cut = count * 0.02;
  let low = 0;
  let high = 255;
  for (let seen = 0; low < 255; low += 1) {
    seen += histogram[low];
    if (seen > cut) break;
  }
  for (let seen = 0; high > 0; high -= 1) {
    seen += histogram[high];
    if (seen > cut) break;
  }
  const range = Math.max(1, high - low);
  for (let index = 0; index < count; index += 1) {
    const value = Math.max(0, Math.min(255, Math.round(((grey[index] - low) * 255) / range)));
    const at = index * 4;
    pixels[at] = value;
    pixels[at + 1] = value;
    pixels[at + 2] = value;
  }
}

/** The scale that brings a picture's long side into the reader's range. */
export function readScale(width: number, height: number): number {
  const long = Math.max(width, height);
  if (long > READ_MAX) return READ_MAX / long;
  if (long < READ_MIN) return Math.min(2, READ_MIN / long);
  return 1;
}

async function draw(blob: Blob, scale: (width: number, height: number) => number) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  const factor = scale(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * factor));
  canvas.height = Math.max(1, Math.round(bitmap.height * factor));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser could not open the picture.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { canvas, context };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("This browser could not prepare the picture."))),
      type,
      quality,
    );
  });
}

/** A grey, contrast-stretched copy for the reader. It is never stored. */
export async function prepareForReading(picture: Blob): Promise<Blob> {
  const { canvas, context } = await draw(picture, readScale);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  stretchContrast(image.data);
  context.putImageData(image, 0, 0);
  return toBlob(canvas, "image/png");
}

export type KeepFile = { blob: Blob; name: string; type: string };

/** A smaller colour copy to keep. Files that are not pictures are kept as they are. */
export async function shrinkForKeeping(file: File): Promise<KeepFile> {
  const asIs: KeepFile = { blob: file, name: file.name, type: file.type || "application/octet-stream" };
  if (!file.type.startsWith("image/")) return asIs;
  try {
    const { canvas } = await draw(file, (width, height) => Math.min(1, KEEP_MAX / Math.max(width, height)));
    const blob = await toBlob(canvas, "image/jpeg", 0.82);
    if (file.type === "image/jpeg" && blob.size >= file.size) return asIs;
    return { blob, name: `${file.name.replace(/\.[a-z\d]{2,5}$/i, "") || "picture"}.jpg`, type: "image/jpeg" };
  } catch {
    return asIs;
  }
}
