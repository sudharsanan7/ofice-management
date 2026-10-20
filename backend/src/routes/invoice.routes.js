const express = require('express');
const controller = require('../controllers/invoice.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/invoice.validator');

const router = express.Router();
router.use(verifyToken);

router.post('/', can('invoices', 'create'), validate(schemas.createInvoiceSchema), controller.createInvoice);
router.post('/from-quotation/:id', can('invoices', 'create'), validate(schemas.idParamsSchema, 'params'), validate(schemas.convertSchema), controller.convertFromQuotation);
router.get('/', can('invoices', 'read'), validate(schemas.listQuerySchema, 'query'), controller.getInvoices);
router.get('/:id/pdf', can('invoices', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getPDF);
router.post('/:id/send', can('invoices', 'send'), validate(schemas.idParamsSchema, 'params'), validate(schemas.sendEmailSchema), controller.sendInvoiceEmail);
router.get('/:id', can('invoices', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getInvoiceById);
router.put('/:id', can('invoices', 'update'), validate(schemas.idParamsSchema, 'params'), validate(schemas.updateInvoiceSchema), controller.updateInvoice);
router.delete('/:id', can('invoices', 'delete'), validate(schemas.idParamsSchema, 'params'), controller.deleteInvoice);

module.exports = router;
