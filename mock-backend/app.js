// Backend de démonstration pour TravelMate : comptes, jetons JWT (accès + rafraîchissement),
// voyages et envoi de photos. Les données vivent en mémoire et disparaissent au redémarrage.
// Il sert à faire tourner l'application en local : ne pas l'exposer sur Internet.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import multer from 'multer';

const ACCESS_TTL = 15 * 60; // secondes
const REFRESH_TTL = 7 * 24 * 3600;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };

export function createApp({ uploadDir, secret = crypto.randomBytes(32).toString('hex') }) {
  fs.mkdirSync(uploadDir, { recursive: true });

  const users = new Map(); // email -> utilisateur
  const refreshTokens = new Map(); // jeton -> { userId, expiresAt }
  const trips = [];

  const sign = (data) => crypto.createHmac('sha256', secret).update(data).digest();

  function signJwt(payload, ttl) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + ttl })).toString('base64url');
    return `${header}.${body}.${sign(`${header}.${body}`).toString('base64url')}`;
  }

  function verifyJwt(token) {
    const [header, body, signature] = String(token).split('.');
    if (!header || !body || !signature) return null;
    const given = Buffer.from(signature, 'base64url');
    const expected = sign(`${header}.${body}`);
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      return payload.exp * 1000 > Date.now() ? payload : null;
    } catch {
      return null;
    }
  }

  function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
  }

  function passwordMatches(user, password) {
    const { hash } = hashPassword(password, user.salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
  }

  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, roles: ['user'] });

  function issueTokens(user) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    refreshTokens.set(refreshToken, { userId: user.id, expiresAt: Date.now() + REFRESH_TTL * 1000 });
    return {
      accessToken: signJwt({ sub: user.id, email: user.email }, ACCESS_TTL),
      refreshToken,
      expiresIn: ACCESS_TTL,
    };
  }

  function requireAuth(req, res, next) {
    const [scheme, token] = (req.get('authorization') || '').split(' ');
    const payload = scheme === 'Bearer' ? verifyJwt(token) : null;
    if (!payload) return res.status(401).json({ error: 'Jeton absent, invalide ou expiré' });
    req.userId = payload.sub;
    next();
  }

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => cb(null, crypto.randomUUID() + IMAGE_EXTENSIONS[file.mimetype]),
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype in IMAGE_EXTENSIONS),
  });

  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use('/uploads', express.static(uploadDir));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.post('/auth/register', (req, res) => {
    const { email, password, name } = req.body ?? {};
    if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'Email invalide' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Le nom est obligatoire' });

    const key = email.trim().toLowerCase();
    if (users.has(key)) return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });

    const user = { id: crypto.randomUUID(), email: key, name: name.trim(), ...hashPassword(password) };
    users.set(key, user);
    res.status(201).json({ user: publicUser(user), ...issueTokens(user) });
  });

  app.post('/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const user = typeof email === 'string' ? users.get(email.trim().toLowerCase()) : undefined;
    if (!user || typeof password !== 'string' || !passwordMatches(user, password)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    res.json({ user: publicUser(user), ...issueTokens(user) });
  });

  // Rotation : chaque jeton de rafraîchissement ne sert qu'une fois
  app.post('/auth/refresh', (req, res) => {
    const token = req.body?.refreshToken;
    const entry = refreshTokens.get(token);
    refreshTokens.delete(token);
    const user = entry && [...users.values()].find((u) => u.id === entry.userId);
    if (!entry || entry.expiresAt < Date.now() || !user) {
      return res.status(401).json({ error: 'Session expirée' });
    }
    res.json(issueTokens(user));
  });

  app.post('/auth/logout', requireAuth, (req, res) => {
    for (const [token, entry] of refreshTokens) {
      if (entry.userId === req.userId) refreshTokens.delete(token);
    }
    res.status(204).end();
  });

  app.get('/trips', requireAuth, (req, res) => {
    res.json(trips.filter((t) => t.userId === req.userId).map(({ userId, ...trip }) => trip));
  });

  app.post('/trips', requireAuth, (req, res) => {
    const { title, destination, startDate, endDate, description, image, photos } = req.body ?? {};
    for (const [field, value] of Object.entries({ title, destination, startDate, endDate })) {
      if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({ error: `Champ obligatoire manquant : ${field}` });
      }
    }
    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
      return res.status(400).json({ error: 'Dates invalides' });
    }
    if (Date.parse(endDate) < Date.parse(startDate)) {
      return res.status(400).json({ error: 'La date de fin précède la date de début' });
    }
    const trip = {
      id: crypto.randomUUID(),
      userId: req.userId,
      title: title.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      description: typeof description === 'string' ? description : undefined,
      image: typeof image === 'string' ? image : undefined,
      photos: Array.isArray(photos) ? photos.filter((p) => typeof p === 'string') : [],
      createdAt: new Date().toISOString(),
    };
    trips.push(trip);
    const { userId, ...body } = trip;
    res.status(201).json(body);
  });

  // L'application envoie ses photos sans jeton : la route reste publique, mais n'accepte
  // qu'une image de 5 Mo maximum, enregistrée sous un nom aléatoire.
  app.post('/uploads', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Image JPEG, PNG, WebP ou HEIC attendue' });
    res.status(201).json({ url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  });

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Image trop lourde (5 Mo maximum)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalide' });
    console.error(err);
    res.status(500).json({ error: 'Erreur interne' });
  });

  return app;
}

export const uploadDirFor = (dir) => path.join(dir, 'uploads');
