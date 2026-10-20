const express = require('express');
const controller = require('../controllers/notification.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const Joi = require('joi');

const idParamsSchema = Joi.object({ id: Joi.string().hex().length(24).required() });
const router = express.Router();
router.use(verifyToken);
router.get('/', controller.getNotifications);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validate(idParamsSchema, 'params'), controller.markRead);

module.exports = router;
