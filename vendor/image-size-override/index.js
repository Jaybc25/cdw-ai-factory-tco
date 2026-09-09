"use strict";

// Minimal image-size override used by pptxgenjs. Strips vulnerable/unneeded
// ICNS, HEIF, and JXL parsers; only PNG/JPEG dimensions are returned.
// Exported shape matches image-size@1.x: sync function returning
// { width, height, type }.

const fs = require("fs");

function readUInt16BE(buf, offset) {
  return (buf[offset] << 8) | buf[offset + 1];
}
function readUInt16LE(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8);
}
function readUInt32BE(buf, offset) {
  return (buf[offset] << 24) | (buf[offset + 1] << 16) | (buf[offset + 2] << 8) | buf[offset + 3];
}
function readUInt32LE(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24);
}

function pngSize(input) {
  const buf = input instanceof Buffer ? input : fs.readFileSync(input);
  // PNG signature is 8 bytes; first chunk must be IHDR.
  if (buf.length < 24 || buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") return;
  const width = readUInt32BE(buf, 16);
  const height = readUInt32BE(buf, 20);
  return { width, height, type: "png" };
}

function jpegSize(input) {
  const buf = input instanceof Buffer ? input : fs.readFileSync(input);
  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) return;
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    if (offset + 1 >= buf.length) break; // end of buffer, incomplete marker
    const marker = buf[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    if (offset + 3 >= buf.length) break; // segment header truncated
    const length = readUInt16BE(buf, offset + 2);
    if (length < 2) break; // malformed/zero-length segment
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      const height = readUInt16BE(buf, offset + 5);
      const width = readUInt16BE(buf, offset + 7);
      return { width, height, type: "jpg" };
    }
    offset += 2 + length;
  }
}

function imageSize(input) {
  if (!input) throw new TypeError("invalid invocation");
  const png = pngSize(input);
  if (png) return png;
  const jpg = jpegSize(input);
  if (jpg) return jpg;
  throw new TypeError("unsupported file type");
}

function imageSizeSync(input) {
  return imageSize(input);
}

function types() {
  return ["png", "jpg"];
}

module.exports = imageSize;
module.exports.imageSize = imageSize;
module.exports.imageSizeSync = imageSizeSync;
module.exports.types = types;
