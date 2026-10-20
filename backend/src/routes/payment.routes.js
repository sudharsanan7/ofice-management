const express = require('express');
const controller = require('../controllers/payment.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/payment.validator');

const router = express.Router();
router.use(verifyToken);

router.post('/', can('payments', 'create'), validate(schemas.createPaymentSchema), controller.createPayment);
router.get('/', can('payments', 'read'), validate(schemas.listQuerySchema, 'query'), controller.getPayments);
router.get('/:id', can('payments', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getPaymentById);
router.delete('/:id', can('payments', 'delete'), validate(schemas.idParamsSchema, 'params'), controller.deletePayment);

module.exports = router;
