import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, Calendar, Shield, AlertCircle, Info, AlertTriangle, XCircle, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import Papa from 'papaparse';

interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  ip: string;
  userAgent: string;
  createdAt: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  resourceId?: string;
}

const severityConfig = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  critical: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700' },
};

function getSeverity(action: string): 'info' | 'warning' | 'error' | 'critical' {
  const a = action.toLowerCase();
  if (a.includes('delete') || a.includes('reject')) return 'warning';
  if (a.includes('login') || a.includes('logout') || a.includes('update') || a.includes('add') || a.includes('create')) return 'info';
  if (a.includes('fraud') || a.includes('suspicious')) return 'critical';
  if (a.includes('export') || a.includes('view')) return 'info';
  return 'info';
}

export const AuditLogsEnhanced: React.FC = () => {
  const { getAuthHeaders } = useStore();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/activity-logs', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Server error');
      const data = await resp.json();
      const enhanced = data.map((log: any) => ({ ...log, severity: getSeverity(log.action) }));
      setLogs(enhanced);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !search ||
      log.adminName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search);

    const logSeverity = getSeverity(log.action);
    const matchesSeverity = severityFilter === 'all' || logSeverity === severityFilter;

    const logDate = new Date(log.createdAt);
    const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesSeverity && matchesDateFrom && matchesDateTo;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCSV = () => {
    const csvData = filteredLogs.map(log => ({
      Timestamp: new Date(log.createdAt).toLocaleString(),
      Admin: log.adminName,
      Action: log.action,
      Details: log.details,
      IP: log.ip,
      Severity: getSeverity(log.action),
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Shield size={20} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Audit Logs</h3>
              <p className="text-xs text-gray-500">{filteredLogs.length} of {logs.length} entries</p>
            </div>
          </div>
          <button onClick={exportCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
            <Download size={14} />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search logs..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={severityFilter}
            onChange={e => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border rounded-lg text-sm"
            placeholder="To date"
          />
        </div>

        {(search || severityFilter !== 'all' || dateFrom || dateTo) && (
          <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <span className="text-xs text-gray-500">Filters active</span>
            <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1">
              <XCircle size={12} />
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      ) : paginatedLogs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-12 text-center">
          <Shield size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-semibold">No audit logs found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 text-xs font-bold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Severity</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Admin</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Details</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">IP</th>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedLogs.map(log => {
                  const sev = getSeverity(log.action);
                  const config = severityConfig[sev];
                  const Icon = config.icon;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.bg} ${config.color}`}>
                          <Icon size={12} />
                          {sev}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-sm">{log.action}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span className="text-sm">{log.adminName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell max-w-xs truncate">{log.details}</td>
                      <td className="px-4 py-3 text-sm font-mono text-xs hidden lg:table-cell">{log.ip}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 dark:bg-gray-900">
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages} ({filteredLogs.length} entries)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
