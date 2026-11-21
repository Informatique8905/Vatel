import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

// Réception multipart en MÉMOIRE (buffer) — aucun fichier n'atterrit sur le
// disque du serveur ; l'image part directement vers Cloudinary.
// Le mimetype déclaré est un premier filtre ; le type réel est revérifié par
// magic bytes dans le service Cloudinary.
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(415, 'BAD_IMAGE_TYPE', 'Format accepté : JPEG, PNG ou WebP'));
    }
    cb(null, true);
  },
});

// Champ de formulaire unique : "image". Les erreurs Multer sont normalisées
// en ApiError (taille dépassée -> 413).
export const dishImageUpload = (req, _res, next) => {
  upload.single('image')(req, _res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'IMAGE_TOO_LARGE', `Image trop lourde (max ${Math.round(env.uploadMaxBytes / 1024 / 1024)} Mo)`));
    }
    next(err);
  });
};
