const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');

const dateRange = (startDate, endDate, field) => {
  const query = {};
  if (startDate || endDate) {
    query[field] = {};
    if (startDate) query[field].$gte = new Date(startDate);
    if (endDate) query[field].$lte = new Date(`${endDate}T23:59:59.999Z`);
  }
  return query;
};

class ReportService {
  static async getSummary({ startDate, endDate } = {}) {
    const quotationMatch = dateRange(startDate, endDate, 'issueDate');
    const invoiceMatch = dateRange(startDate, endDate, 'issueDate');
    const paymentMatch = dateRange(startDate, endDate, 'paymentDate');
    const expenseMatch = dateRange(startDate, endDate, 'expenseDate');

    const [quotationStats, invoiceStats, payments, expenses, outstanding, paymentTrend, expenseTrend] = await Promise.all([
      Quotation.aggregate([
        { $match: quotationMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$grandTotal' } } }
      ]),
      Invoice.aggregate([
        { $match: invoiceMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$grandTotal' }, paid: { $sum: '$amountPaid' }, due: { $sum: '$balanceDue' } } }
      ]),
      Payment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      Invoice.aggregate([
        { $match: { status: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
        { $group: { _id: '$status', count: { $sum: 1 }, due: { $sum: '$balanceDue' } } }
      ]),
      Payment.aggregate([
        { $match: paymentMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const quotationMap = Object.fromEntries(['draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => [status, { count: 0, total: 0 }]));
    quotationStats.forEach((row) => { quotationMap[row._id] = { count: row.count, total: row.total }; });
    const accepted = quotationMap.accepted.count;
    const converted = await Quotation.countDocuments({ ...quotationMatch, convertedToInvoice: { $ne: null } });
    const revenue = payments.reduce((sum, row) => sum + row.total, 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + row.total, 0);

    return {
      range: { startDate: startDate || null, endDate: endDate || null },
      quotations: quotationMap,
      quotationConversion: {
        accepted,
        converted,
        rate: accepted ? Math.round((converted / accepted) * 10000) / 100 : 0
      },
      invoices: invoiceStats,
      payments,
      expenses,
      trends: this.mergeTrends(paymentTrend, expenseTrend),
      outstanding,
      totals: {
        revenue,
        expenses: expenseTotal,
        net: Math.round((revenue - expenseTotal) * 100) / 100
      }
    };
  }

  static mergeTrends(paymentTrend, expenseTrend) {
    const byMonth = new Map();
    for (const { _id, total } of paymentTrend) {
      byMonth.set(_id, { month: _id, revenue: total, expenses: 0 });
    }
    for (const { _id, total } of expenseTrend) {
      const row = byMonth.get(_id) || { month: _id, revenue: 0, expenses: 0 };
      row.expenses = total;
      byMonth.set(_id, row);
    }
    return [...byMonth.values()].sort((left, right) => left.month.localeCompare(right.month));
  }

  static async exportExcel(filters) {
    const summary = await this.getSummary(filters);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OfficeFlow';
    const sheet = workbook.addWorksheet('Summary');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 32 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    sheet.addRows([
      { metric: 'Revenue collected', value: summary.totals.revenue },
      { metric: 'Expenses', value: summary.totals.expenses },
      { metric: 'Net', value: summary.totals.net },
      { metric: 'Quotation conversion %', value: summary.quotationConversion.rate }
    ]);
    const trendsSheet = workbook.addWorksheet('Monthly trends');
    trendsSheet.columns = [
      { header: 'Month', key: 'month', width: 16 },
      { header: 'Revenue collected', key: 'revenue', width: 22 },
      { header: 'Expenses', key: 'expenses', width: 18 }
    ];
    summary.trends.forEach((row) => trendsSheet.addRow(row));
    const quotationsSheet = workbook.addWorksheet('Quotations');
    quotationsSheet.columns = [
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Total', key: 'total', width: 18 }
    ];
    Object.entries(summary.quotations).forEach(([status, row]) => quotationsSheet.addRow({ status, ...row }));
    const expensesSheet = workbook.addWorksheet('Expenses');
    expensesSheet.columns = [
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Count', key: 'count', width: 12 },
      { header: 'Total', key: 'total', width: 18 }
    ];
    summary.expenses.forEach((row) => expensesSheet.addRow({ category: row._id, count: row.count, total: row.total }));
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  static async exportPdf(filters) {
    const summary = await this.getSummary(filters);
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      doc.font('Helvetica-Bold').fontSize(18).text('OfficeFlow Financial Report');
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(10).fillColor('#475569')
        .text(`Range: ${summary.range.startDate || 'All'} to ${summary.range.endDate || 'All'}`);
      doc.moveDown();
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(12).text('Totals');
      doc.font('Helvetica').fontSize(11)
        .text(`Revenue: ₹ ${summary.totals.revenue.toFixed(2)}`)
        .text(`Expenses: ₹ ${summary.totals.expenses.toFixed(2)}`)
        .text(`Net: ₹ ${summary.totals.net.toFixed(2)}`)
        .text(`Quotation conversion: ${summary.quotationConversion.rate}%`);
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Quotations by status');
      doc.font('Helvetica');
      Object.entries(summary.quotations).forEach(([status, row]) => {
        doc.text(`${status}: ${row.count} (₹ ${Number(row.total || 0).toFixed(2)})`);
      });
      doc.end();
    });
  }
}

module.exports = ReportService;
