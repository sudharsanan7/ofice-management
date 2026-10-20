const express = require('express');
const fs = require('fs');
const controller = require('../controllers/expense.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const schemas = require('../validators/expense.validator');
const { errorResponse } = require('../utils/apiResponse');
const { uploadReceipt } = require('../middleware/upload.middleware');

const handleReceipt = (req, res, next) => {
  uploadReceipt.single('receipt')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Receipt file size exceeds the 5MB limit.',
        data: null,
        errors: [{ field: 'receipt', message: 'Maximum allowed file size is 5MB' }]
      });
    }
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Error uploading receipt.',
      data: null,
      errors: [{ field: 'receipt', message: err.message }]
    });
  });
};

const validateExpense = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
    errors: { wrap: { label: '' } }
  });
  if (!error) {
    req.body = value;
    return next();
  }
  const respond = () => errorResponse(res, {
    statusCode: 400,
    message: 'Request validation failed',
    errors: error.details.map((detail) => ({ field: detail.path.join('.'), message: detail.message }))
  });
  if (!req.file) return respond();
  return fs.unlink(req.file.path, (unlinkError) => {
    if (unlinkError && unlinkError.code !== 'ENOENT') return next(unlinkError);
    return respond();
  });
};

const router = express.Router();
router.use(verifyToken);

router.post('/', can('expenses', 'create'), handleReceipt, validateExpense(schemas.createExpenseSchema), controller.createExpense);
router.get('/', can('expenses', 'read'), validate(schemas.listQuerySchema, 'query'), controller.getExpenses);
router.get('/:id/receipt', can('expenses', 'read'), validate(schemas.idParamsSchema, 'params'), controller.downloadReceipt);
router.get('/:id', can('expenses', 'read'), validate(schemas.idParamsSchema, 'params'), controller.getExpenseById);
router.put('/:id', can('expenses', 'update'), validate(schemas.idParamsSchema, 'params'), handleReceipt, validateExpense(schemas.updateExpenseSchema), controller.updateExpense);
router.delete('/:id', can('expenses', 'delete'), validate(schemas.idParamsSchema, 'params'), controller.deleteExpense);

module.exports = router;
