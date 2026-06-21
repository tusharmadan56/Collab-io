const express = require('express');
const cors = require('cors');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const logger = require('./utils/logger');

const authRoutes = require('./modules/auth/auth.routes');
const roomsRoutes = require('./modules/rooms/rooms.routes');
const documentsRoutes = require('./modules/documents/documents.routes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/documents', documentsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// 4-arg signature tells Express this is an error handler
// Hide stack traces in production to avoid leaking internals
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error('Unhandled error', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
