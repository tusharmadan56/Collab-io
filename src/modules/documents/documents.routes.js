const { Router } = require('express');
const { authMiddleware } = require('../../middleware/auth');
const documentsController = require('./documents.controller');

const router = Router();

router.get('/:roomId', authMiddleware, documentsController.getDocument);
router.post('/:roomId/save', authMiddleware, documentsController.saveSnapshot);

module.exports = router;
