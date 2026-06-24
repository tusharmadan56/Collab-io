const { z } = require('zod');

const roomIdParamSchema = z.object({
  roomId: z.string().uuid({ message: 'Invalid room ID' }),
});

module.exports = { roomIdParamSchema };
