import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, Download, Key, FileText, Loader2, ShoppingBag, ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Sale } from '../types';

export default function PurchasesView() {
  const { getAuthHeaders } = useStore();
  const [purchases, setPurchases] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/customer/purchases', { headers });
        if (!res.ok) throw new Error('Gagal memuat data pembelian');
        const data = await res.json();
        setPurchases(data);
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    };
    fetchPurchases();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600 mx-auto" size={40} />
          <p className="text-gray-500 font-medium">Memuat produk Anda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
            <Package size={32} className="text-red-400" />
          </div>
          <p className="text-gray-700 font-bold">Gagal Memuat</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-24 h-24 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto">
            <ShoppingBag size={48} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Belum Ada Pembelian</h3>
            <p className="text-gray-500 text-sm mt-2">Produk yang Anda beli akan muncul di sini setelah pembayaran dikonfirmasi.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] bg-clip-text text-transparent">Produk Saya</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium flex items-center gap-2">
            <Package size={16} className="text-[#2FA084]" />
            {purchases.length} produk digital telah dibeli
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-wider">Akses Selamanya</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {purchases.map((purchase, idx) => {
          const isDownloadExpired = purchase.downloadExpiresAt
            ? new Date() > new Date(purchase.downloadExpiresAt)
            : false;

          return (
            <motion.div
              key={purchase.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-2xl transition-all group"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-[#1F6F5F] via-[#2FA084] to-[#6FCF97] p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                      <Package size={28} className="text-white" />
                    </div>
                    <span className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                      <CheckCircle size={12} />
                      Aktif
                    </span>
                  </div>
                  <h3 className="text-white font-black mt-4 text-lg leading-tight line-clamp-2">
                    {purchase.productName || 'Produk Digital'}
                  </h3>
                  <p className="text-white/70 text-xs mt-2 font-semibold flex items-center gap-1.5">
                    <Clock size={12} />
                    {new Date(purchase.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Amount */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-[#6FCF97]/20 dark:from-gray-700 dark:to-[#1F6F5F]/20 rounded-2xl border border-gray-100 dark:border-gray-600">
                  <span className="text-gray-600 dark:text-gray-300 font-bold text-sm">Total Investasi</span>
                  <span className="font-black text-[#1F6F5F] dark:text-[#6FCF97] text-lg">
                    Rp {(purchase.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* License Key */}
                {purchase.licenseKey && (
                  <div className="bg-gradient-to-br from-[#6FCF97]/20 to-[#2FA084]/20 rounded-2xl p-4 border-2 border-[#2FA084]/30 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-[#1F6F5F] to-[#2FA084] rounded-lg flex items-center justify-center">
                        <Key size={14} className="text-white" />
                      </div>
                      <p className="text-xs font-black text-[#1F6F5F] uppercase tracking-wider">License Key</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-[#2FA084]/30">
                      <code className="text-sm font-mono font-bold text-[#1F6F5F] flex-1 break-all">
                        {purchase.licenseKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(purchase.licenseKey!);
                          alert('License key disalin!');
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white text-xs font-black rounded-lg hover:from-[#2FA084] hover:to-[#1F6F5F] transition-all flex-shrink-0"
                      >
                        Salin
                      </button>
                    </div>
                  </div>
                )}

                {/* Download */}
                {purchase.downloadToken && (
                  <div className="space-y-3">
                    {isDownloadExpired ? (
                      <div className="flex items-center gap-3 text-sm text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                        <Clock size={18} className="flex-shrink-0" />
                        <span className="font-bold">Link unduhan sudah kedaluwarsa</span>
                      </div>
                    ) : (
                      <>
                        <a
                          href={`/api/download/${purchase.downloadToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-[#1F6F5F] to-[#2FA084] text-white rounded-2xl text-sm font-black hover:from-[#2FA084] hover:to-[#6FCF97] transition-all shadow-lg shadow-[#2FA084]/30 group"
                        >
                          <Download size={18} className="group-hover:animate-bounce" />
                          Unduh Produk Sekarang
                        </a>
                        {purchase.downloadExpiresAt && (
                          <p className="text-xs text-gray-500 text-center font-semibold flex items-center justify-center gap-1.5">
                            <Clock size={12} />
                            Kedaluwarsa: {new Date(purchase.downloadExpiresAt).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Invoice */}
                <button
                  onClick={async () => {
                    try {
                      const { jsPDF } = await import('jspdf');
                      const doc = new jsPDF();
                      doc.setFontSize(20);
                      doc.setFont('helvetica', 'bold');
                      doc.text('INVOICE', 105, 20, { align: 'center' });
                      doc.setFontSize(10);
                      doc.setFont('helvetica', 'normal');
                      doc.text(`Invoice ID: ${purchase.id}`, 20, 40);
                      doc.text(`Tanggal: ${new Date(purchase.createdAt).toLocaleDateString('id-ID')}`, 20, 50);
                      doc.text(`Produk: ${purchase.productName || 'Produk Digital'}`, 20, 60);
                      doc.text(`Total: Rp ${(purchase.amount || 0).toLocaleString('id-ID')}`, 20, 70);
                      doc.text(`Status: Lunas`, 20, 80);
                      doc.save(`invoice-${purchase.id}.pdf`);
                    } catch (e) {
                      alert('Gagal membuat invoice');
                    }
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-gray-200 text-gray-700 rounded-2xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <FileText size={16} />
                  Unduh Invoice PDF
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
