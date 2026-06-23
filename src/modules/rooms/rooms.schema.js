const { z } = require('zod');

const createRoomSchema = z.object({
  name: z.string()
    .min(1, { message: 'Room name is required' })
    .max(100, { message: 'Room name must be at most 100 characters' }),
});

const roomIdParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid room ID' }),
});

module.exports = { createRoomSchema, roomIdParamSchema };
