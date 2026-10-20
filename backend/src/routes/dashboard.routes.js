const express = require('express');
const { getSummary } = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(verifyToken);
router.get('/', getSummary);

module.exports = router;
