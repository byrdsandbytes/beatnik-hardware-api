import Fastify from 'fastify';
import cors from '@fastify/cors';
import { audioRoutes } from './routes/audio';
import { snapcastRoutes } from './routes/snapcast';
import { systemRoutes } from './routes/system';
import { mdnsService } from './services/mdns.service';
import { gpioService } from './services/gpio.service';

const server = Fastify({
  logger: true
});

// CORS aktivieren
server.register(cors, { 
  origin: true // Erlaubt alle Origins (für Entwicklung ok, später einschränken)
});

// Routen registrieren
server.register(audioRoutes, { prefix: '/api/hardware' });
server.register(systemRoutes, { prefix: '/api/system' });
server.register(snapcastRoutes, { prefix: '/api/snapcast' });

const start = async () => {
  try {
    // Port 3000 ist Standard für interne Microservices
    // Host 0.0.0.0 erlaubt Zugriff vom Controller Container oder LAN
    await server.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🎧 Beatnik Hardware Service is running on port 3000');
    
    // Start mDNS advertisement
    await mdnsService.start();
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  gpioService.shutdown();
  console.log('Shutting down...');
  await mdnsService.stop();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();