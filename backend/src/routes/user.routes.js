const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateStatus,
  getProfile,
  updateProfile,
  updatePassword
} = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createUserSchema,
  updateUserSchema,
  updateStatusSchema,
  updateProfileSchema,
  updatePasswordSchema
} = require('../validators/user.validator');

const router = express.Router();

// All user management routes require authenticated session
router.use(verifyToken);

// --- Self Profile Endpoints (Available to any active user) ---
router.get('/me', can('users', 'read_profile'), getProfile);
router.patch('/me', can('users', 'update_profile'), validate(updateProfileSchema), updateProfile);
router.patch('/me/password', validate(updatePasswordSchema), updatePassword);

// --- Admin-Managed User Endpoints ---
router.post('/', can('users', 'create'), validate(createUserSchema), createUser);
router.get('/', can('users', 'read'), getUsers);
router.get('/:id', can('users', 'read'), getUserById);
router.put('/:id', can('users', 'update'), validate(updateUserSchema), updateUser);
router.patch('/:id/status', can('users', 'manage_status'), validate(updateStatusSchema), updateStatus);

module.exports = router;
