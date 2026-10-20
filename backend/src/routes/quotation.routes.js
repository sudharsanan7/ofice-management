const express = require('express');
const controller = require('../controllers/quotation.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/quotation.validator');

const router = express.Router();
router.use(verifyToken);

/**
 * @openapi
 * /api/quotations:
 *   post:
 *     tags: [Quotations]
 *     summary: Create a draft quotation (number and totals are server generated)
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/QuotationInput' } } } }
 *     responses:
 *       '201': { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/ApiSuccess' } } } }
 *       '400': { description: Invalid input }
 *       '401': { description: Authentication required }
 */
router.post('/', can('quotations', 'create'), validate(schemas.createQuotationSchema), controller.createQuotation);
/**
 * @openapi
 * /api/quotations:
 *   get:
 *     tags: [Quotations]
 *     summary: List quotations with pagination and filters
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, minimum: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 100 } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [all, draft, sent, accepted, rejected, expired] } }
 *       - { in: query, name: client, schema: { type: string } }
 *       - { in: query, name: startDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: endDate, schema: { type: string, format: date-time } }
 *       - { in: query, name: sort, schema: { type: string } }
 *     responses:
 *       '200': { description: Paginated quotations }
 *       '400': { description: Invalid filters }
 *       '401': { description: Authentication required }
 */
router.get('/', can('quotations', 'read'), validate(schemas.listQuerySchema, 'query'), controller.getQuotations);
/** @openapi
 * /api/quotations/stats/summary:
 *   get:
 *     tags: [Quotations]
 *     summary: Get counts and totals grouped by status
 *     security: [{ bearerAuth: [] }]
 *     responses: { '200': { description: Status summary }, '401': { description: Authentication required } }
 */
router.get('/stats/summary', can('quotations', 'read'), controller.getSummary);
/** @openapi
 * /api/quotations/{id}:
 *   get:
 *     tags: [Quotations]
 *     summary: Get a quotation with populated client and status history
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string, pattern: '^[a-fA-F0-9]{24}$' } }]
 *     responses: { '200': { description: Quotation }, '400': { description: Invalid ID }, '404': { description: Not found } }
 */
router.get('/:id', can('quotations', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getQuotationById);
/** @openapi
 * /api/quotations/{id}/pdf:
 *   get:
 *     tags: [Quotations]
 *     summary: Download quotation PDF
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { '200': { description: PDF document, content: { application/pdf: { schema: { type: string, format: binary } } } }, '404': { description: Not found } }
 */
router.get('/:id/pdf', can('quotations', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getPDF);
/** @openapi
 * /api/quotations/{id}/send:
 *   post:
 *     tags: [Quotations]
 *     summary: Email a quotation PDF to the client
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { subject: { type: string }, message: { type: string }, cc: { oneOf: [{ type: string, format: email }, { type: array, items: { type: string, format: email } }] } } } } }
 *     responses: { '200': { description: Sent }, '400': { description: Invalid request }, '502': { description: Mail service failure } }
 */
router.post('/:id/send', can('quotations', 'send'), validate(schemas.idParamsSchema, 'params'), validate(schemas.sendEmailSchema), controller.sendQuotationEmail);
/** @openapi
 * /api/quotations/{id}:
 *   put:
 *     tags: [Quotations]
 *     summary: Update a draft quotation created by the current team member or any quotation as admin
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/QuotationInput' } } } }
 *     responses: { '200': { description: Updated }, '400': { description: Locked or invalid }, '403': { description: Not owner }, '404': { description: Not found } }
 */
router.put('/:id', can('quotations', 'update'), validate(schemas.idParamsSchema, 'params'), validate(schemas.updateQuotationSchema), controller.updateQuotation);
/** @openapi
 * /api/quotations/{id}/status:
 *   patch:
 *     tags: [Quotations]
 *     summary: Change status using supported transitions
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object, required: [status], properties: { status: { type: string, enum: [sent, accepted, rejected, expired] } } } } } }
 *     responses: { '200': { description: Status updated }, '400': { description: Invalid transition } }
 */
router.patch('/:id/status', can('quotations', 'update'), validate(schemas.idParamsSchema, 'params'), validate(schemas.updateStatusSchema), controller.updateStatus);
/** @openapi
 * /api/quotations/{id}/duplicate:
 *   post:
 *     tags: [Quotations]
 *     summary: Clone a quotation into a new draft with a new number
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { '201': { description: New quotation }, '404': { description: Not found } }
 */
router.post('/:id/duplicate', can('quotations', 'create'), validate(schemas.idParamsSchema, 'params'), controller.duplicateQuotation);
/** @openapi
 * /api/quotations/{id}:
 *   delete:
 *     tags: [Quotations]
 *     summary: Delete a draft quotation (creator or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { '200': { description: Deleted }, '400': { description: Only drafts may be deleted }, '403': { description: Not owner }, '404': { description: Not found } }
 */
router.delete('/:id', can('quotations', 'delete'), validate(schemas.idParamsSchema, 'params'), controller.deleteQuotation);

module.exports = router;
