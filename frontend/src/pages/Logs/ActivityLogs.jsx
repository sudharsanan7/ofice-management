import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import Table from '../../components/common/Table';
import { useToast } from '../../context/ToastContext';
import activityApi from '../../api/activity.api';
import { formatDateTime } from '../../utils/formatters';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1 });
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    activityApi.getLogs({ page, limit: 25 })
      .then((response) => { setLogs(response.data.logs || []); setPagination(response.data.pagination || { totalPages: 1 }); })
      .catch((error) => showToast(error.message || 'Unable to load activity logs.', 'error'))
      .finally(() => setLoading(false));
  }, [page, showToast]);

  const columns = [
    { header: 'Timestamp', key: 'timestamp', render: (row) => formatDateTime(row.timestamp) },
    { header: 'User', key: 'user', render: (row) => row.user?.name || 'System' },
    { header: 'Action', key: 'action', render: (row) => <span className="font-medium">{row.action}</span> },
    { header: 'Entity', key: 'entity' },
    { header: 'Entity ID', key: 'entityId', render: (row) => <span className="font-mono text-xs">{row.entityId || '—'}</span> },
    { header: 'IP Address', key: 'ipAddress', render: (row) => row.ipAddress || '—' }
  ];

  return <div className="space-y-6">
    <div className="border-b border-slate-200 pb-3"><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><History size={22} /> System Activity Audit Logs</h1><p className="mt-1 text-sm text-slate-500">Recent system operations and data changes</p></div>
    <Table columns={columns} data={logs} isLoading={loading} emptyMessage="No activity logs recorded yet" emptySubtext="System operations will appear here." />
    {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-3 text-sm"><button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pagination.totalPages}</span><button className="rounded border px-3 py-1 disabled:opacity-50" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div>}
  </div>;
}
