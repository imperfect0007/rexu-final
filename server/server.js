require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/auth');
const emergencyProfileRoutes = require('./src/routes/emergencyProfile');
const qrRoutes = require('./src/routes/qr');
const publicRoutes = require('./src/routes/public');
const adminRoutes = require('./src/routes/admin');
const qrService = require('./src/services/qrService');

const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

// Rate limits
const generalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_GENERAL) || 100,
  message: { success: false, error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_AUTH) || 10,
  message: { success: false, error: 'Too many attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});
const emergencyScanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_EMERGENCY_SCAN) || 30,
  message: { success: false, error: 'Too many scans' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/e', emergencyScanLimiter);

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'rexu-backend' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/emergency-profile', emergencyProfileRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/admin', adminRoutes);

// Public emergency page (no /api prefix so QR URL is short)
app.use('/', publicRoutes);

// Serve QR PNGs (read-only)
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'qrcodes');
app.use('/uploads/qrcodes', express.static(uploadDir, { maxAge: '1d' }));

// 404
app.use((req, res, next) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler (last)
app.use(errorHandler);

// Start
async function start() {
  try {
    await qrService.ensureUploadDir();
  } catch (err) {
    console.warn('Upload dir creation failed:', err.message);
  }
  app.listen(PORT, () => {
    console.log(`REXU backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
