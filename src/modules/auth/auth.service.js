const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../config/db');
const logger = require('../../utils/logger');

// 12 rounds balances security vs login latency (~250ms on modern hardware)
const SALT_ROUNDS = 12;

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

// Refresh token is an opaque string stored in DB — not a JWT, so it can be revoked
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');

  // Parse duration string (e.g. "30d") into a future timestamp
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
  const days = parseInt(expiresIn);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

async function register(email, password) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const error = new Error('Email already registered');
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
    [email, passwordHash]
  );

  const user = result.rows[0];
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  logger.info('User registered', { userId: user.id, email: user.email });

  return { user, accessToken, refreshToken };
}

async function login(email, password) {
  const result = await db.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    // Same error message for wrong email and wrong password to prevent user enumeration
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  logger.info('User logged in', { userId: user.id, email: user.email });

  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    accessToken,
    refreshToken,
  };
}

async function refresh(token) {
  const result = await db.query(
    'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token = $1',
    [token]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  const storedToken = result.rows[0];

  if (new Date(storedToken.expires_at) < new Date()) {
    // Clean up expired token
    await db.query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);
    const error = new Error('Refresh token expired');
    error.statusCode = 401;
    throw error;
  }

  // Rotate: delete old token and issue a new pair (prevents token reuse attacks)
  await db.query('DELETE FROM refresh_tokens WHERE id = $1', [storedToken.id]);

  const userResult = await db.query('SELECT id, email FROM users WHERE id = $1', [storedToken.user_id]);
  if (userResult.rows.length === 0) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  const user = userResult.rows[0];
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);

  return { accessToken, refreshToken };
}

async function logout(token) {
  await db.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  logger.info('Refresh token revoked');
}

// Revoke all sessions for a user (e.g., password change, account compromise)
async function revokeAllTokens(userId) {
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  logger.info('All refresh tokens revoked', { userId });
}

module.exports = { register, login, refresh, logout, revokeAllTokens, generateAccessToken };
