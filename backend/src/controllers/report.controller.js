const ReportService = require('../services/report.service');
const { successResponse } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getSummary = asyncHandler(async (req, res) => {
  const summary = await ReportService.getSummary(req.query);
  return successResponse(res, { message: 'Report summary retrieved successfully.', data: summary });
});
const exportReport = asyncHandler(async (req, res) => {
  const format = req.query.format || 'xlsx';
  if (format === 'pdf') {
    const buffer = await ReportService.exportPdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="officeflow-report.pdf"');
    return res.send(buffer);
  }
  const buffer = await ReportService.exportExcel(req.query);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="officeflow-report.xlsx"');
  return res.send(buffer);
});

module.exports = { getSummary, exportReport };
