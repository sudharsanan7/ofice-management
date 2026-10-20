const express = require('express');
const { getSettings, updateSettings } = require('../controllers/setting.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { can } = require('../middleware/role.middleware');
const { uploadLogo } = require('../middleware/upload.middleware');
const validate = require('../middleware/validate.middleware');
const { updateSettingSchema } = require('../validators/setting.validator');
const { errorResponse } = require('../utils/apiResponse');

const router = express.Router();
const parseSettingsObjects = (req, res, next) => {
  for (const key of ['address', 'numberingPrefixes', 'bankDetails']) {
    if (typeof req.body[key] !== 'string') continue;
    try {
      req.body[key] = JSON.parse(req.body[key]);
    } catch (_error) {
      return errorResponse(res, { statusCode: 400, message: `The ${key} field must contain valid JSON.` });
    }
  }
  return next();
};

// Authentication required for settings
router.use(verifyToken);

/**
 * @route   GET /api/settings
 * @desc    Get company settings (Available to any authenticated user)
 * @access  Private (Admin & Team Member)
 */
router.get('/', can('settings', 'read'), getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update system settings & upload company logo
 * @access  Admin Only
 */
router.put(
  '/',
  can('settings', 'update'),
  (req, res, next) => {
    uploadLogo.single('logo')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Logo file size exceeds the 2MB limit.',
            data: null,
            errors: [{ field: 'logo', message: 'Maximum allowed file size is 2MB' }]
          });
        }
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || 'Error uploading logo file.',
          data: null,
          errors: [{ field: 'logo', message: err.message }]
        });
      }
      next();
    });
  },
  parseSettingsObjects,
  validate(updateSettingSchema),
  updateSettings
);

module.exports = router;
