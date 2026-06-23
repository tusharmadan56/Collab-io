const { Router } = require('express');
const { authMiddleware } = require('../../middleware/auth');
const roomsController = require('./rooms.controller');

const router = Router();

router.post('/', authMiddleware, roomsController.createRoom);
router.get('/:id', roomsController.getRoom);
router.post('/:id/join', authMiddleware, roomsController.joinRoom);
router.get('/:id/history', authMiddleware, roomsController.getRoomHistory);

module.exports = router;
