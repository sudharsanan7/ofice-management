const express = require('express');
const { getLogs } = require('../controllers/activityLog.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { logsQuerySchema } = require('../validators/report.validator');

const router = express.Router();
router.use(verifyToken);
router.get('/', can('logs', 'read'), validate(logsQuerySchema, 'query'), getLogs);

module.exports = router;
