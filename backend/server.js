/**
 * WisataPass – Server Entry Point
 * Initializes HTTP server, Socket.IO, and connects to MariaDB.
 */
require('dotenv').config();
const http      = require('http');
const { Server } = require('socket.io');
const app        = require('./src/app');
const { testConnection } = require('./src/config/database');
const socketSvc  = require('./src/sockets/socketService');
const logger     = require('./src/utils/logger');

const PORT = parseInt(process.env.PORT) || 3001;

async function bootstrap() {
  // 1 – Test DB connection
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.error('Cannot connect to MariaDB. Check .env and ensure the DB server is running.');
    process.exit(1);
  }

  // 2 – Create HTTP + Socket.IO server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin:      process.env.FRONTEND_ORIGIN || '*',
      methods:     ['GET','POST'],
      credentials: true,
    },
    transports: ['websocket','polling'],
  });

  // 3 – Initialize socket service
  socketSvc.init(io);
  logger.info('Socket.IO initialised');

  // 4 – Scheduled jobs
  scheduleJobs();

  // 5 – Start listening
  server.listen(PORT, () => {
    logger.info(`🚀 WisataPass backend running on http://localhost:${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   DB: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
  });

  // 6 – Graceful shutdown
  const shutdown = async (sig) => {
    logger.info(`${sig} received – shutting down…`);
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

function scheduleJobs() {
  const QRModel     = require('./src/modules/qr/qrModel');
  const TicketModel = require('./src/modules/tickets/TicketModel');

  // Auto-expire QR codes every 5 minutes
  setInterval(async () => {
    try {
      const n = await QRModel.expireOld();
      if (n > 0) logger.info(`Auto-expired ${n} QR code(s).`);
    } catch (e) { logger.error('QR expiry job error:', e.message); }
  }, 5 * 60 * 1000);

  // Auto-expire tickets every hour
  setInterval(async () => {
    try {
      const n = await TicketModel.expireOld();
      if (n > 0) logger.info(`Auto-expired ${n} ticket(s).`);
    } catch (e) { logger.error('Ticket expiry job error:', e.message); }
  }, 60 * 60 * 1000);

  logger.info('Scheduled jobs registered (QR expiry, ticket expiry).');
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
