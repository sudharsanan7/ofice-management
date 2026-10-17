const ClientService = require('../services/client.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create new client
 * @route   POST /api/clients
 */
const createClient = asyncHandler(async (req, res) => {
  const client = await ClientService.createClient({
    data: req.body,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    statusCode: 201,
    message: 'Client created successfully',
    data: client
  });
});

/**
 * @desc    Get all clients with search and pagination
 * @route   GET /api/clients
 */
const getClients = asyncHandler(async (req, res) => {
  const result = await ClientService.getClients(req.query);

  return successResponse(res, {
    message: 'Clients retrieved successfully',
    data: result
  });
});

/**
 * @desc    Get single client details with quotations, invoices, and financial totals
 * @route   GET /api/clients/:id
 */
const getClientDetails = asyncHandler(async (req, res) => {
  const result = await ClientService.getClientDetails(req.params.id);

  return successResponse(res, {
    message: 'Client details retrieved successfully',
    data: result
  });
});

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 */
const updateClient = asyncHandler(async (req, res) => {
  const client = await ClientService.updateClient({
    clientId: req.params.id,
    data: req.body,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: 'Client updated successfully',
    data: client
  });
});

/**
 * @desc    Delete client (Blocked if client has existing invoices)
 * @route   DELETE /api/clients/:id
 */
const deleteClient = asyncHandler(async (req, res) => {
  const result = await ClientService.deleteClient({
    clientId: req.params.id,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: result.message,
    data: null
  });
});

/**
 * @desc    Archive or restore client
 * @route   PATCH /api/clients/:id/status
 */
const setClientStatus = asyncHandler(async (req, res) => {
  const client = await ClientService.setClientStatus({
    clientId: req.params.id,
    status: req.body.status,
    reqUser: req.user,
    ipAddress: req.ip
  });

  return successResponse(res, {
    message: `Client status updated to ${req.body.status}`,
    data: client
  });
});

/**
 * @desc    Get activity logs for a client
 * @route   GET /api/clients/:id/activity
 */
const getClientActivity = asyncHandler(async (req, res) => {
  const logs = await ClientService.getClientActivity(req.params.id);

  return successResponse(res, {
    message: 'Client activity logs retrieved successfully',
    data: logs
  });
});

module.exports = {
  createClient,
  getClients,
  getClientDetails,
  updateClient,
  deleteClient,
  setClientStatus,
  getClientActivity
};
