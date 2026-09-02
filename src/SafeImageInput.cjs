const fs = require("fs");
const path = require("path");

const ALLOWED_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function hasPngSignature(header) {
  return header.length >= PNG_SIGNATURE.length && header.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
}

function hasJpegSignature(header) {
  return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

function validateSafeImagePath(imagePath, { label = "image path", maxBytes = MAX_IMAGE_BYTES } = {}) {
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

  const fd = fs.openSync(imagePath, "r");
  const header = Buffer.alloc(12);
  let bytesRead = 0;
  try {
    bytesRead = fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  const actualHeader = header.subarray(0, bytesRead);

  const signatureMatches = ext === ".png" ? hasPngSignature(actualHeader) : hasJpegSignature(actualHeader);
  if (!signatureMatches) {
    throw new Error(`${label} extension does not match a valid PNG/JPEG file signature`);
  }

  return imagePath;
}

module.exports = {
  ALLOWED_IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  validateSafeImagePath,
};
