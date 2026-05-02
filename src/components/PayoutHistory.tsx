import { useState, useEffect } from 'react';
import { Wallet, Clock, CheckCircle, XCircle, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { WithdrawalRequest } from '../types';

const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  approved: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Selesai', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export function PayoutHistory() {
  const { getAuthHeaders } = useStore();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/affiliate/withdrawals', { headers });
        if (res.ok) {
          const data = await res.json();
          setWithdrawals(Array.isArray(data) ? data : []);
        } else {
          setError('Gagal memuat riwayat penarikan');
        }
      } catch (err) {
        setError('Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
      }
    };
    fetchWithdrawals();
  }, []);

  const totalPaid = withdrawals
    .filter(w => w.status === 'completed' || w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  const totalPending = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2FA084]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Riwayat Pencairan</h2>
        <p className="text-gray-500 text-sm mt-1">Semua permintaan penarikan komisi Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Dicairkan</p>
          <p className="text-2xl font-black text-green-600 mt-2">
            Rp {totalPaid.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menunggu</p>
          <p className="text-2xl font-black text-yellow-600 mt-2">
            Rp {totalPending.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
          <p className="text-2xl font-black text-gray-900 dark:text-white mt-2">
            {withdrawals.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {withdrawals.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700">
          <Wallet className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Belum Ada Pencairan</h3>
          <p className="text-gray-500 text-sm mt-2">Anda belum melakukan pencairan komisi</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Metode</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {withdrawals
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((w) => {
                    const cfg = statusConfig[w.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {new Date(w.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-gray-900 dark:text-white">
                            Rp {w.amount.toLocaleString('id-ID')}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">{w.paymentMethod.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">{w.paymentDetails}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                            <StatusIcon size={12} /> {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {w.processedAt && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <ArrowUpRight size={10} /> Diproses: {new Date(w.processedAt).toLocaleDateString('id-ID')}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
