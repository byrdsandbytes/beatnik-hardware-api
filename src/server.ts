import Fastify from 'fastify';
import cors from '@fastify/cors';
import { audioRoutes } from './routes/audio';
import { snapcastRoutes } from './routes/snapcast';

const server = Fastify({
  logger: true
});

// CORS aktivieren
server.register(cors, { 
  origin: true // Erlaubt alle Origins (für Entwicklung ok, später einschränken)
});

// Routen registrieren
server.register(audioRoutes, { prefix: '/api/hardware' });
server.register(snapcastRoutes, { prefix: '/api/snapcast' });

const start = async () => {
  try {
    // Port 3000 ist Standard für interne Microservices
    // Host 0.0.0.0 erlaubt Zugriff vom Controller Container oder LAN
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🎧 Beatnik Hardware Service is running on port 3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();