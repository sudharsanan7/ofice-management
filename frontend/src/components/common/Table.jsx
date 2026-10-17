import React from 'react';
import Spinner from './Spinner';
import { Inbox } from 'lucide-react';

export default function Table({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Get started by creating a new entry.',
  actionButton,
  className = '',
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`px-6 py-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                  col.className || ''
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Spinner size="lg" />
                  <span className="text-sm font-medium text-slate-500">Loading data...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="rounded-full bg-slate-100 p-3 text-slate-400">
                    <Inbox className="h-8 w-8" />
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-slate-800">{emptyMessage}</h4>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm">{emptySubtext}</p>
                  {actionButton && <div className="mt-4">{actionButton}</div>}
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row._id || row.id || rowIdx}
                className="hover:bg-slate-50/80 transition-colors duration-100"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    className={`whitespace-nowrap px-6 py-4 text-slate-700 ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
