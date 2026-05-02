import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy({ onBack }: { onBack?: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 transition-colors">
          <ArrowLeft size={18} /> Kembali
        </button>
      )}
      <h1 className="text-4xl font-black text-gray-900 mb-2">Kebijakan Privasi</h1>
      <p className="text-gray-500 text-sm mb-8">Terakhir diperbarui: 1 Mei 2026</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">1. Informasi yang Kami Kumpulkan</h2>
          <p className="text-gray-600 leading-relaxed">
            Kami mengumpulkan informasi yang Anda berikan saat mendaftar, melakukan transaksi, atau menggunakan layanan kami, termasuk: nama, alamat email, informasi pembayaran, dan data aktivitas penggunaan platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">2. Bagaimana Kami Menggunakan Informasi</h2>
          <ul className="text-gray-600 space-y-2 list-disc list-inside">
            <li>Memproses transaksi dan pembayaran</li>
            <li>Mengelola program afiliasi dan menghitung komisi</li>
            <li>Mengirimkan notifikasi terkait layanan</li>
            <li>Meningkatkan keamanan dan mencegah penipuan</li>
            <li>Mematuhi kewajiban hukum dan peraturan</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">3. Berbagi Informasi</h2>
          <p className="text-gray-600 leading-relaxed">
            Kami tidak menjual informasi pribadi Anda. Informasi dapat dibagikan kepada pihak ketiga hanya untuk: pemrosesan pembayaran (Stripe), analisis layanan, atau jika diwajibkan oleh hukum.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">4. Keamanan Data</h2>
          <p className="text-gray-600 leading-relaxed">
            Kami menggunakan enkripsi SSL/TLS, penyimpanan data terenkripsi, dan langkah-langkah keamanan teknis lainnya untuk melindungi informasi Anda.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">5. Hak Anda</h2>
          <p className="text-gray-600 leading-relaxed">
            Anda memiliki hak untuk mengakses, memperbarui, atau menghapus data pribadi Anda. Hubungi kami di privacy@digisell.id untuk permintaan terkait hak privasi.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">6. Cookie</h2>
          <p className="text-gray-600 leading-relaxed">
            Kami menggunakan cookie untuk meningkatkan pengalaman Anda, melacak konversi afiliasi, dan analisis layanan. Anda dapat mengelola preferensi cookie melalui pengaturan browser.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">7. Hubungi Kami</h2>
          <p className="text-gray-600 leading-relaxed">
            Jika Anda memiliki pertanyaan tentang kebijakan privasi ini, hubungi kami di <strong>privacy@digisell.id</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
