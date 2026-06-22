const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
