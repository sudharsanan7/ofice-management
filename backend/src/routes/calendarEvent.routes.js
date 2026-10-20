const express = require('express');
const controller = require('../controllers/calendarEvent.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/calendarEvent.validator');

const router = express.Router();
router.use(verifyToken);

router.get('/assignees', can('events', 'read'), controller.getAssignees);
router.get('/', can('events', 'read'), validate(schemas.listEventsSchema, 'query'), controller.getEvents);
router.post('/', can('events', 'create'), validate(schemas.createEventSchema), controller.createEvent);
router.put('/:id', can('events', 'update'), validate(schemas.idParamsSchema, 'params'), validate(schemas.updateEventSchema), controller.updateEvent);
router.delete('/:id', can('events', 'delete'), validate(schemas.idParamsSchema, 'params'), controller.deleteEvent);

module.exports = router;
