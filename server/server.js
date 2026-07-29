/**
 * WisataPass – Main Server Entry Point
 */
require('dotenv').config();
const http        = require('http');
const path        = require('path');
const express     = require('express');
const { Server }  = require('socket.io');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const logger       = require('./utils/logger');
const { pool }     = require('./config/database');
const socketService = require('./services/socketService');

// ── Routes ──────────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/authRoutes');
const attractionRoutes  = require('./routes/attractionRoutes');
const ticketTypeRoutes  = require('./routes/ticketTypeRoutes');
const bookingRoutes     = require('./routes/bookingRoutes');
const paymentRoutes     = require('./routes/paymentRoutes');
const ticketRoutes      = require('./routes/ticketRoutes');
const customerRoutes    = require('./routes/customerRoutes');
const promotionRoutes   = require('./routes/promotionRoutes');
const reportRoutes      = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reviewRoutes      = require('./routes/reviewRoutes');
const dashboardRoutes   = require('./routes/dashboardRoutes');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ── Trust proxy (for rate-limiter behind nginx) ──────────────────────────────
app.set('trust proxy', 1);

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy:      false,
  crossOriginEmbedderPolicy:  false,
  crossOriginOpenerPolicy:    false,   // was blocking module loading in some browsers
  crossOriginResourcePolicy:  false,   // was blocking module loading in some browsers
}));

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));

// ── Webhook raw body (Midtrans signature verification needs raw) ─
app.use('/api/payments/webhook', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => {
    try { req.body = JSON.parse(data); } catch (_) { req.body = {}; }
    next();
  });
});

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP logger ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', { stream: { write: msg => logger.info(msg.trim()) } }));
}

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX || 200),
  message:  { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/', globalLimiter);

// ── Auth rate limiter ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many login attempts, please try again in 15 minutes.' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Static files ─────────────────────────────────────────────────────────────
const clientPath  = path.join(__dirname, '..', 'client', 'public');
const uploadPath  = path.join(__dirname, '..', 'uploads');
app.use(express.static(clientPath));
app.use('/uploads', express.static(uploadPath));

// ── Socket.IO setup ───────────────────────────────────────────────────────────
socketService.init(io);
app.set('io', io);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/attractions',   attractionRoutes);
app.use('/api/ticket-types',  ticketTypeRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/tickets',       ticketRoutes);
app.use('/api/customers',     customerRoutes);
app.use('/api/promotions',    promotionRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews',       reviewRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: e.message });
  }
});

// ── SPA fallback – serve index.html for all non-API routes ────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} – ${err.message} – ${req.originalUrl}`);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File size too large (max 5 MB).' });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 WisataPass server running on http://localhost:${PORT}`);
  logger.info(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Database    : ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
});

module.exports = { app, server, io };
