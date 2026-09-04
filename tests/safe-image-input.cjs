const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_WIDTH,
  validateSafeImagePath,
} = require("../src/SafeImageInput.cjs");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "safe-image-input-"));

function writePng(filePath, width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  fs.writeFileSync(filePath, buffer);
}

function writeJpeg(filePath, width, height) {
  const bytes = [
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ];
  fs.writeFileSync(filePath, Buffer.from(bytes));
}

try {
  const png = path.join(dir, "valid.png");
  writePng(png, 800, 400);
  assert.strictEqual(validateSafeImagePath(png), png);

  const jpeg = path.join(dir, "valid.jpg");
  writeJpeg(jpeg, 1200, 600);
  assert.strictEqual(validateSafeImagePath(jpeg), jpeg);

  const fake = path.join(dir, "renamed.jpg");
  fs.writeFileSync(fake, "not actually an image");
  assert.throws(
    () => validateSafeImagePath(fake),
    /extension does not match a valid PNG\/JPEG file signature/,
  );

  const tooWide = path.join(dir, "too-wide.png");
  writePng(tooWide, MAX_IMAGE_WIDTH + 1, 100);
  assert.throws(() => validateSafeImagePath(tooWide), /dimension limit/);

  const tooTall = path.join(dir, "too-tall.png");
  writePng(tooTall, 100, MAX_IMAGE_HEIGHT + 1);
  assert.throws(() => validateSafeImagePath(tooTall), /dimension limit/);

  const tooManyPixels = path.join(dir, "too-many-pixels.png");
  writePng(tooManyPixels, 8000, Math.floor(MAX_IMAGE_PIXELS / 8000) + 1);
  assert.throws(() => validateSafeImagePath(tooManyPixels), /pixel limit/);

  const malformedJpeg = path.join(dir, "malformed.jpg");
  fs.writeFileSync(malformedJpeg, Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]));
  assert.throws(() => validateSafeImagePath(malformedJpeg), /dimensions could not be determined/);

  console.log("SafeImageInput validation: PASS");
  console.log("- valid PNG and JPEG accepted");
  console.log("- extension/signature mismatch rejected");
  console.log(`- width/height capped at ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}`);
  console.log(`- decoded pixel count capped at ${MAX_IMAGE_PIXELS.toLocaleString("en-US")}`);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
