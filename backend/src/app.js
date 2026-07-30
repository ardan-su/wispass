/**
 * WisataPass – Express Application
 * MariaDB full-stack edition
 */
require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const compression  = require('compression');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const logger       = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security & Rate Limiting ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin:      process.env.FRONTEND_ORIGIN || '*',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             500,
  standardHeaders: true,
  legacyHeaders:   false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts, please try again later.' },
});
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      100,
  message:  { success: false, message: 'Too many scan attempts, please slow down.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/admin/qr/scan', scanLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
// Raw body for Midtrans webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP logging ──────────────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trimEnd()) },
  skip:   (req) => req.url.startsWith('/uploads'),
}));

// ── Static files ──────────────────────────────────────────────────────────────
const UPLOAD_DIR   = path.join(__dirname, '../../uploads');
const FRONTEND_DIR = path.join(__dirname, '../../frontend/public');

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(FRONTEND_DIR));

// ── Response compression ──────────────────────────────────────────────────────
app.use(compression({ threshold: 1024 }));

// ── API Routes ────────────────────────────────────────────────────────────────
const authRoutes         = require('./modules/auth/authRoutes');
const siteRoutes         = require('./modules/admin/siteRoutes');
const orderRoutes        = require('./modules/tickets/orderRoutes');
const ticketRoutes       = require('./modules/tickets/ticketRoutes');
const paymentRoutes      = require('./modules/payment/paymentRoutes');
const qrRoutes           = require('./modules/qr/qrRoutes');
const dashboardRoutes    = require('./modules/dashboard/dashboardRoutes');
const reportRoutes       = require('./modules/reports/reportRoutes');
const userRoutes         = require('./modules/users/userRoutes');
const promotionRoutes    = require('./modules/admin/promotionRoutes');
const reviewRoutes       = require('./modules/admin/reviewRoutes');
const notificationRoutes = require('./modules/admin/notificationRoutes');
const customerRoutes     = require('./modules/admin/customerRoutes');
const branchRoutes       = require('./modules/admin/branchRoutes');
const settingsRoutes     = require('./modules/settings/settingsRoutes');

// Existing routes
app.use('/api/auth',         authRoutes);
app.use('/api/attractions',  siteRoutes);
app.use('/api/sites',        siteRoutes);
app.use('/api/bookings',     orderRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/tickets',      ticketRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/admin/qr',     qrRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/reports',      reportRoutes);

// New routes
app.use('/api/users',         userRoutes);
app.use('/api/promotions',    promotionRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/customers',     customerRoutes);
app.use('/api/branches',      branchRoutes);
app.use('/api/settings',      settingsRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'disconnected';
  try {
    const { query } = require('./config/database');
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (_) {}
  res.json({
    status:       'ok',
    db:           dbStatus,
    uptime:       process.uptime(),
    timestamp:    new Date().toISOString(),
    responseTime: `${Date.now() - start}ms`,
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found.' });
  }
  const indexFile = path.join(FRONTEND_DIR, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) res.status(404).json({ success: false, message: 'Not found.' });
  });
});

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
