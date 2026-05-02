import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Shield, CheckCircle, XCircle, Eye, Search, Filter, Download, Clock, User, DollarSign } from 'lucide-react';
import { FraudAlert } from '../types';
import { useStore } from '../store/useStore';
import Papa from 'papaparse';

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  false_positive: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
};

export function FraudAlertDashboard() {
  const { getAuthHeaders } = useStore();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/fraud-alerts', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setAlerts(data);
      } else {
        console.error('Failed to load fraud alerts');
      }
    } catch (err: any) {
      console.error('Failed to load fraud alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleUpdateStatus = async (alertId: string, status: FraudAlert['status'], note?: string) => {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/fraud-alerts/${alertId}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution: note })
      });
      if (resp.ok) {
        await loadAlerts();
        setSelectedAlert(null);
        setResolutionNote('');
      } else {
        const err = await resp.json();
        alert('Gagal: ' + (err.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Failed to update alert: ' + err.message);
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesSearch = !search ||
      alert.description.toLowerCase().includes(search.toLowerCase()) ||
      alert.type.toLowerCase().includes(search.toLowerCase()) ||
      alert.userId?.includes(search) ||
      alert.affiliateId?.includes(search);
    return matchesStatus && matchesSeverity && matchesSearch;
  });

  const exportCSV = () => {
    const csvData = filteredAlerts.map(a => ({
      ID: a.id,
      Type: a.type,
      Severity: a.severity,
      Status: a.status,
      Description: a.description,
      User: a.userId || '',
      Affiliate: a.affiliateId || '',
      Sale: a.saleId || '',
      Created: a.createdAt,
      Reviewed: a.reviewedAt || '',
      Resolution: a.resolution || '',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraud-alerts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: alerts.length,
    pending: alerts.filter(a => a.status === 'pending').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical').length,
  };

  if (loading) return <div className="animate-pulse h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-black">Fraud Alert Dashboard</h2>
            <p className="text-xs text-gray-500">Monitor and manage suspicious activities</p>
          </div>
        </div>
        <button onClick={exportCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
          <Download size={14} />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500 font-medium">Total Alerts</p>
          <p className="text-2xl font-black mt-1">{stats.total}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-xs text-amber-600 font-medium">Pending Review</p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <p className="text-xs text-green-600 font-medium">Resolved</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">{stats.resolved}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-xs text-red-600 font-medium">Critical</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">{stats.critical}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search alerts..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
          </select>
          <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Shield size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No alerts found</p>
              <p className="text-xs mt-1">All clear or adjust filters</p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                  alert.status === 'pending' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className={
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'high' ? 'text-orange-600' :
                      alert.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'
                    } />
                    <div>
                      <p className="font-bold text-sm">{alert.type.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${severityColors[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColors[alert.status]}`}>
                      {alert.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {selectedAlert?.id === alert.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500">Created</p>
                        <p className="font-bold">{new Date(alert.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">User ID</p>
                        <p className="font-bold font-mono">{alert.userId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Affiliate ID</p>
                        <p className="font-bold font-mono">{alert.affiliateId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Sale ID</p>
                        <p className="font-bold font-mono">{alert.saleId || 'N/A'}</p>
                      </div>
                    </div>
                    {alert.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <input
                          value={resolutionNote}
                          onChange={e => setResolutionNote(e.target.value)}
                          placeholder="Add resolution note..."
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'resolved', resolutionNote)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700"
                        >
                          <CheckCircle size={14} /> Resolve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(alert.id, 'false_positive', resolutionNote)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-gray-700"
                        >
                          <XCircle size={14} /> False Positive
                        </button>
                      </div>
                    )}
                    {alert.resolution && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                        <p className="text-gray-500 text-xs">Resolution:</p>
                        <p>{alert.resolution}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
