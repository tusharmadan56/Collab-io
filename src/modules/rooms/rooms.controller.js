const { createRoomSchema, roomIdParamSchema } = require('./rooms.schema');
const roomsService = require('./rooms.service');
const logger = require('../../utils/logger');

async function createRoom(req, res, next) {
  try {
    const bodyValidation = createRoomSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({ message: bodyValidation.error.errors[0].message });
    }

    const { name } = bodyValidation.data;
    const room = await roomsService.createRoom(name, req.user.id);

    return res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (err) {
    logger.error('Create room error', { error: err.message });
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const paramValidation = roomIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.errors[0].message });
    }

    const room = await roomsService.getRoomById(paramValidation.data.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(200).json({ room });
  } catch (err) {
    logger.error('Get room error', { error: err.message });
    next(err);
  }
}

async function joinRoom(req, res, next) {
  try {
    const paramValidation = roomIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.errors[0].message });
    }

    await roomsService.joinRoom(paramValidation.data.id, req.user.id);

    return res.status(200).json({ message: 'Joined room successfully' });
  } catch (err) {
    logger.error('Join room error', { error: err.message });
    next(err);
  }
}

async function getRoomHistory(req, res, next) {
  try {
    const paramValidation = roomIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.errors[0].message });
    }

    const history = await roomsService.getRoomHistory(paramValidation.data.id);

    return res.status(200).json({ history });
  } catch (err) {
    logger.error('Get room history error', { error: err.message });
    next(err);
  }
}

module.exports = { createRoom, getRoom, joinRoom, getRoomHistory };
