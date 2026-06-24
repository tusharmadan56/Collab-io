const { roomIdParamSchema } = require('./documents.schema');
const documentsService = require('./documents.service');
const logger = require('../../utils/logger');

async function getDocument(req, res, next) {
  try {
    const paramValidation = roomIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.errors[0].message });
    }

    const doc = await documentsService.getDocument(paramValidation.data.roomId);

    return res.status(200).json({ document: doc });
  } catch (err) {
    logger.error('Get document error', { error: err.message });
    next(err);
  }
}

async function saveSnapshot(req, res, next) {
  try {
    const paramValidation = roomIdParamSchema.safeParse(req.params);
    if (!paramValidation.success) {
      return res.status(400).json({ message: paramValidation.error.errors[0].message });
    }

    const result = await documentsService.saveSnapshot(paramValidation.data.roomId);

    return res.status(200).json({
      message: 'Document snapshot saved',
      document: result,
    });
  } catch (err) {
    logger.error('Save snapshot error', { error: err.message });
    next(err);
  }
}

module.exports = { getDocument, saveSnapshot };
