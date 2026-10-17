const express = require('express');
const {
  createClient,
  getClients,
  getClientDetails,
  updateClient,
  deleteClient,
  setClientStatus,
  getClientActivity
} = require('../controllers/client.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createClientSchema,
  updateClientSchema,
  archiveClientSchema
} = require('../validators/client.validator');

const router = express.Router();

// All client routes require authentication
router.use(verifyToken);

/**
 * @route   POST /api/clients
 * @desc    Create a new client
 * @access  Private (Admin & Team Member)
 */
router.post('/', can('clients', 'create'), validate(createClientSchema), createClient);

/**
 * @route   GET /api/clients
 * @desc    List all clients with search and pagination
 * @access  Private (Admin & Team Member)
 */
router.get('/', can('clients', 'read'), getClients);

/**
 * @route   GET /api/clients/:id
 * @desc    Get client profile, quotations, invoices, and financial totals
 * @access  Private (Admin & Team Member)
 */
router.get('/:id', can('clients', 'read'), getClientDetails);

/**
 * @route   GET /api/clients/:id/activity
 * @desc    Get audit trail and activity history for client
 * @access  Private (Admin & Team Member)
 */
router.get('/:id/activity', can('clients', 'read'), getClientActivity);

/**
 * @route   PUT /api/clients/:id
 * @desc    Update client information
 * @access  Private (Admin & Team Member)
 */
router.put('/:id', can('clients', 'update'), validate(updateClientSchema), updateClient);

/**
 * @route   PATCH /api/clients/:id/status
 * @desc    Archive or restore client
 * @access  Private (Admin & Team Member)
 */
router.patch('/:id/status', can('clients', 'update'), validate(archiveClientSchema), setClientStatus);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete client (Blocked if client has existing invoices)
 * @access  Private (Admin Only)
 */
router.delete('/:id', can('clients', 'delete'), deleteClient);

module.exports = router;
