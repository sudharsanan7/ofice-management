const express = require('express');
const controller = require('../controllers/report.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { reportQuerySchema } = require('../validators/report.validator');

const router = express.Router();
router.use(verifyToken);
router.get('/', can('reports', 'read'), validate(reportQuerySchema, 'query'), controller.getSummary);
router.get('/export', can('reports', 'export'), validate(reportQuerySchema, 'query'), controller.exportReport);

module.exports = router;
