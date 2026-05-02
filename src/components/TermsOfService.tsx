import { ArrowLeft } from 'lucide-react';

export function TermsOfService({ onBack }: { onBack?: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft size={18} /> Kembali
        </button>
      )}
      <h1 className="text-4xl font-black text-gray-900 mb-2">Syarat & Ketentuan</h1>
      <p className="text-gray-500 text-sm mb-8">Terakhir diperbarui: 1 Mei 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Penerimaan Syarat</h2>
          <p className="text-gray-600 leading-relaxed">
            Dengan mengakses dan menggunakan platform DigiSell, Anda menyetujui untuk terikat oleh Syarat & Ketentuan ini. Jika Anda tidak setuju, harap tidak menggunakan layanan kami.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Layanan</h2>
          <p className="text-gray-600 leading-relaxed">
            DigiSell menyediakan platform untuk penjualan produk digital dan program afiliasi. Kami berhak mengubah, menangguhkan, atau menghentikan layanan kapan saja tanpa pemberitahuan sebelumnya.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Program Afiliasi</h2>
          <ul className="text-gray-600 space-y-2 list-disc list-inside">
            <li>Afiliasi harus berusia minimal 18 tahun</li>
            <li>Dilarang melakukan self-referral atau manipulasi klik</li>
            <li>Komisi dihitung berdasarkan penjualan yang berhasil dan telah melewati masa holding</li>
            <li>Kami berhak membatalkan komisi yang terdeteksi sebagai penipuan</li>
            <li>Penarikan minimum sesuai kebijakan yang berlaku</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Pembayaran & Pengembalian Dana</h2>
          <p className="text-gray-600 leading-relaxed">
            Semua pembayaran diproses melalui Stripe. Kebijakan pengembalian dana mengikuti ketentuan masing-masing produk. Komisi afiliasi akan dibatalkan jika terjadi refund.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Larangan</h2>
          <p className="text-gray-600 leading-relaxed">
            Pengguna dilarang: (a) Menggunakan platform untuk aktivitas ilegal, (b) Melakukan reverse engineering, (c) Spam atau penipuan, (d) Mengirim malware, (e) Melanggar hak kekayaan intelektual pihak ketiga.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Batasan Tanggung Jawab</h2>
          <p className="text-gray-600 leading-relaxed">
            DigiSell tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau konsekuensial yang timbul dari penggunaan layanan. Pendapatan afiliasi bervariasi dan tidak dijamin.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Perubahan Syarat</h2>
          <p className="text-gray-600 leading-relaxed">
            Kami berhak mengubah Syarat & Ketentuan ini kapan saja. Perubahan akan berlaku segera setelah dipublikasikan. Penggunaan berkelanjutan menandakan penerimaan perubahan.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">8. Hukum yang Berlaku</h2>
          <p className="text-gray-600 leading-relaxed">
            Syarat & Ketentuan ini diatur oleh hukum Indonesia. Segala sengketa akan diselesaikan di pengadilan yang berwenang di Indonesia.
          </p>
        </section>
      </div>
    </div>
  );
}
