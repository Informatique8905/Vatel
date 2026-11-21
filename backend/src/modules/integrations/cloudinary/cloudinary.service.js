import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../../config/env.js';
import { ApiError } from '../../../utils/errors.js';

// ---------------------------------------------------------------------------
// Intégration Cloudinary — images des plats (ISOLÉE comme l'intégration Jeko).
// Stockage externe uniquement : la base ne retient que secure_url + public_id.
// CLOUDINARY_API_SECRET ne quitte jamais le serveur.
// ---------------------------------------------------------------------------

export const isConfigured = () =>
  Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

const configure = () => {
  if (!isConfigured()) {
    throw new ApiError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Stockage d’images non configuré');
  }
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
};

// Type MIME réel vérifié par magic bytes — le mimetype déclaré par le client
// est une simple affirmation (spec : validation du type réel).
export const sniffImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'png';
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  return null;
};

// Upload d'un buffer (multer memoryStorage) — jamais d'écriture disque.
export const uploadImage = async (buffer, { folder = 'vatel/dishes' } = {}) => {
  configure();
  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, data) => (error ? reject(error) : resolve(data)),
      );
      stream.end(buffer);
    });
    return { photoUrl: result.secure_url, photoPublicId: result.public_id };
  } catch (err) {
    throw new ApiError(502, 'CLOUDINARY_UPLOAD_FAILED', 'Échec de l’envoi de l’image', {
      cause: err.message,
    });
  }
};

// Suppression best-effort : l'échec ne doit pas casser le flux métier
// (image orpheline à purger côté Cloudinary, consignée dans les logs).
export const destroyImage = async (publicId) => {
  if (!publicId || !isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.error(`[cloudinary] Échec suppression ${publicId} : ${err.message}`);
  }
};
