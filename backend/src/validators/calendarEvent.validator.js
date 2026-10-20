const Joi = require('joi');

const idParamsSchema = Joi.object({
  id: Joi.string().hex().length(24).required()
});

const eventFields = {
  title: Joi.string().trim().min(1).max(160),
  description: Joi.string().trim().max(2000).allow(''),
  date: Joi.date().iso(),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow(''),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow(''),
  location: Joi.string().trim().max(300).allow(''),
  meetingUrl: Joi.string().trim().uri({ scheme: ['http', 'https'] }).max(2000).allow(''),
  category: Joi.string().valid('general', 'meeting', 'deadline', 'leave', 'other'),
  assignedTo: Joi.string().hex().length(24),
  status: Joi.string().valid('todo', 'in_progress', 'done')
};

const createEventSchema = Joi.object({
  title: eventFields.title.required(),
  description: eventFields.description.default(''),
  date: eventFields.date.required(),
  assignedTo: eventFields.assignedTo.required(),
  startTime: eventFields.startTime.default(''),
  endTime: eventFields.endTime.default(''),
  location: eventFields.location.default(''),
  meetingUrl: eventFields.meetingUrl.default(''),
  category: eventFields.category.default('general'),
  repeat: Joi.string().valid('none', 'weekly', 'monthly').default('none'),
  repeatCount: Joi.number().integer().min(1).max(52).default(1)
}).unknown(false);

const validateTimes = (value, helpers) => {
  if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    return helpers.error('any.invalid');
  }
  return value;
};
const createEventWithValidTimesSchema = createEventSchema.custom(validateTimes)
  .messages({ 'any.invalid': 'End time must be later than start time.' });
const updateEventSchema = Joi.object(eventFields).min(1).unknown(false).custom(validateTimes)
  .messages({ 'any.invalid': 'End time must be later than start time.' });

const listEventsSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required()
}).unknown(false);

module.exports = { idParamsSchema, createEventSchema: createEventWithValidTimesSchema, updateEventSchema, listEventsSchema };
