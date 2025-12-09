import Fastify from 'fastify';
import { audioRoutes } from './routes/audio';

const server = Fastify({
  logger: true
});

// Routen registrieren
server.register(audioRoutes, { prefix: '/api/hardware' });

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