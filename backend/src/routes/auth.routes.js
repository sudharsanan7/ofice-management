const express = require('express');
const { login, setupInitialAdmin } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', login);
router.post('/setup-admin', setupInitialAdmin);

module.exports = router;
