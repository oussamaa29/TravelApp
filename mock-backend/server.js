import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp, uploadDirFor } from './app.js';

const PORT = Number(process.env.PORT) || 4000;
const here = path.dirname(fileURLToPath(import.meta.url));

createApp({ uploadDir: uploadDirFor(here), secret: process.env.JWT_SECRET })
  // 0.0.0.0 : joignable depuis un téléphone sur le même réseau (Expo Go)
  .listen(PORT, '0.0.0.0', () => {
    console.log(`Backend TravelMate sur http://localhost:${PORT} (données en mémoire)`);
  });
