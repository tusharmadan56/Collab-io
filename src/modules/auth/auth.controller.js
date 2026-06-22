const { registerSchema, loginSchema, refreshSchema } = require('./auth.schema');
const authService = require('./auth.service');
const logger = require('../../utils/logger');

async function register(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const { email, password } = validation.data;
    const result = await authService.register(email, password);

    return res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    logger.error('Register error', { error: err.message });
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const { email, password } = validation.data;
    const result = await authService.login(email, password);

    return res.status(200).json({
      message: 'Login successful',
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const result = await authService.refresh(validation.data.refreshToken);

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (err) {
    logger.error('Refresh error', { error: err.message });
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const validation = refreshSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    await authService.logout(validation.data.refreshToken);

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    logger.error('Logout error', { error: err.message });
    next(err);
  }
}

module.exports = { register, login, refresh, logout };
