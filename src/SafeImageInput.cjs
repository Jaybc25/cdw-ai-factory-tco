const fs = require("fs");
const path = require("path");

const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_WIDTH = 10000;
const MAX_IMAGE_HEIGHT = 10000;
const MAX_IMAGE_PIXELS = 40_000_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function hasPngSignature(header) {
  return header.length >= PNG_SIGNATURE.length && header.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function hasJpegSignature(header) {
  return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

function readPngDimensions(buffer) {
  if (buffer.length < 24 || !hasPngSignature(buffer)) {
    throw new Error("PNG header is incomplete");
  }
  if (buffer.readUInt32BE(8) !== 13 || buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("PNG is missing a valid IHDR header");
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width <= 0 || height <= 0) throw new Error("PNG dimensions must be positive");
  return { width, height };
}

function readJpegDimensions(buffer) {
  if (!hasJpegSignature(buffer)) throw new Error("JPEG header is incomplete");

  let offset = 2;
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] !== 0xff) offset += 1;
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;

    const marker = buffer[offset++];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > buffer.length) break;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw new Error("JPEG contains an invalid segment length");
    }

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (segmentLength < 7) throw new Error("JPEG SOF segment is incomplete");
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width <= 0 || height <= 0) throw new Error("JPEG dimensions must be positive");
      return { width, height };
    }

    if (marker === 0xda) break;
    offset += segmentLength;
  }

  throw new Error("JPEG dimensions could not be determined before image data");
}

function validateImageDimensions(
  buffer,
  ext,
  {
    label,
    maxWidth = MAX_IMAGE_WIDTH,
    maxHeight = MAX_IMAGE_HEIGHT,
    maxPixels = MAX_IMAGE_PIXELS,
  },
) {
  const { width, height } = ext === ".png" ? readPngDimensions(buffer) : readJpegDimensions(buffer);
  const pixels = width * height;

  if (width > maxWidth || height > maxHeight) {
    throw new Error(`${label} dimensions ${width}x${height} exceed the ${maxWidth}x${maxHeight} dimension limit`);
  }
  if (!Number.isSafeInteger(pixels) || pixels > maxPixels) {
    throw new Error(`${label} decoded size ${width}x${height} exceeds the ${maxPixels.toLocaleString("en-US")}-pixel limit`);
  }

  return { width, height };
}

function validateSafeImagePath(
  imagePath,
  {
    label = "image path",
    maxBytes = MAX_IMAGE_BYTES,
    maxWidth = MAX_IMAGE_WIDTH,
    maxHeight = MAX_IMAGE_HEIGHT,
    maxPixels = MAX_IMAGE_PIXELS,
  } = {},
) {
  if (imagePath === null || imagePath === undefined || imagePath === "") return null;
  if (typeof imagePath !== "string") {
    throw new Error(`${label} must be a string path when provided`);
  }

  const ext = path.extname(imagePath).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error(`${label} must use a PNG, JPG, or JPEG file`);
  }

  let stat;
  try {
    stat = fs.statSync(imagePath);
  } catch (error) {
    throw new Error(`${label} does not point to a readable file: ${error.message}`);
  }

  if (!stat.isFile()) {
    throw new Error(`${label} must point to a regular file`);
  }
  if (stat.size <= 0) {
    throw new Error(`${label} file is empty`);
  }
  if (stat.size > maxBytes) {
    const maxMiB = (maxBytes / (1024 * 1024)).toFixed(0);
    throw new Error(`${label} exceeds the ${maxMiB} MiB size limit`);
  }

  const buffer = fs.readFileSync(imagePath);
  const signatureMatches = ext === ".png" ? hasPngSignature(buffer) : hasJpegSignature(buffer);
  if (!signatureMatches) {
    throw new Error(`${label} extension does not match a valid PNG/JPEG file signature`);
  }

  try {
    validateImageDimensions(buffer, ext, { label, maxWidth, maxHeight, maxPixels });
  } catch (error) {
    throw new Error(`${label} failed image-dimension validation: ${error.message}`);
  }

  return imagePath;
}

module.exports = {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_WIDTH,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  readPngDimensions,
  readJpegDimensions,
  validateImageDimensions,
  validateSafeImagePath,
};
