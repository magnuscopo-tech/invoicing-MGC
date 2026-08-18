const sharp = require("sharp");

const IMAGE_PROFILES = {
  logos: {
    width: 700,
    height: 320,
    quality: 82,
  },
  signatures: {
    width: 600,
    height: 260,
    quality: 82,
  },
};

const MAX_COMPRESSED_BYTES = 250 * 1024;

const compressImageToDataUrl = async (file, folder = "logos") => {
  if (!file?.buffer) {
    const error = new Error("An image file is required");
    error.statusCode = 422;
    throw error;
  }

  const profile = IMAGE_PROFILES[folder] || IMAGE_PROFILES.logos;
  const buffer = await sharp(file.buffer, { failOn: "warning" })
    .rotate()
    .resize({
      width: profile.width,
      height: profile.height,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: profile.quality, effort: 4 })
    .toBuffer();

  if (buffer.length > MAX_COMPRESSED_BYTES) {
    const error = new Error("Compressed image is still too large. Please upload a simpler image.");
    error.statusCode = 422;
    throw error;
  }

  return `data:image/webp;base64,${buffer.toString("base64")}`;
};

module.exports = { compressImageToDataUrl };
