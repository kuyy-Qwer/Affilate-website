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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Produk Saya</h2>
          <p className="text-gray-500 text-sm mt-1">{purchases.length} produk telah dibeli</p>
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
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Package size={24} className="text-white" />
                  </div>
                  <span className="flex items-center gap-1.5 bg-green-400/20 text-green-100 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-400/30">
                    <CheckCircle size={10} />
                    Aktif
                  </span>
                </div>
                <h3 className="text-white font-black mt-3 text-base leading-tight line-clamp-2">
                  {purchase.productName || 'Produk Digital'}
                </h3>
                <p className="text-white/60 text-xs mt-1 font-medium">
                  {new Date(purchase.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Amount */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 font-medium">Total Bayar</span>
                  <span className="font-black text-gray-900">
                    Rp {(purchase.amount || 0).toLocaleString('id-ID')}
                  </span>
                </div>

                {/* License Key */}
                {purchase.licenseKey && (
                  <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Key size={12} className="text-indigo-500" />
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">License Key</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-indigo-700 flex-1 break-all">
                        {purchase.licenseKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(purchase.licenseKey!);
                          alert('License key disalin!');
                        }}
                        className="text-[10px] font-black text-indigo-600 hover:underline flex-shrink-0"
                      >
                        Salin
                      </button>
                    </div>
                  </div>
                )}

                {/* Download */}
                {purchase.downloadToken && (
                  <div>
                    {isDownloadExpired ? (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">
                        <Clock size={14} />
                        <span className="font-medium">Link unduhan sudah kedaluwarsa</span>
                      </div>
                    ) : (
                      <a
                        href={`/api/download/${purchase.downloadToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-all"
                      >
                        <Download size={16} />
                        Unduh Produk
                      </a>
                    )}
                    {purchase.downloadExpiresAt && !isDownloadExpired && (
                      <p className="text-[10px] text-gray-400 text-center mt-1.5 font-medium">
                        Kedaluwarsa: {new Date(purchase.downloadExpiresAt).toLocaleDateString('id-ID')}
                      </p>
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
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
                >
                  <FileText size={16} />
                  Unduh Invoice
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
