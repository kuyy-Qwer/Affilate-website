Phase 2 MVP - Email Template Manager (2.4)

Tujuan
- Menyediakan sistem manajemen template email untuk kampanye marketing dan transaksi, dengan CRUD template dan preview sederhana.

Acceptance Criteria
- Create Template: User dapat membuat template email dengan key (optional), subject, htmlBody, variables (array), isActive, updatedAt.
- Read: Daftar template ditampilkan dengan fields utama; opsi view/edit delete tersedia.
- Update: User dapat mengubah seluruh field template dan updatedAt terupdate.
- Delete: Template dapat dihapus dari sistem.
- Preview: Dapat melihat preview sederhana dari isi htmlBody dengan variabel placeholder (tanpa eksekusi runtime).
- Persistensi: Template disimpan di Firestore koleksi emailTemplates dengan fields: id, key, subject, htmlBody, variables, isActive, updatedAt.

Testing Manual
- Masuk ke AdminDashboard > Email Templates.
- Tambah template baru: isi subject, htmlBody, tambahkan variabel (opsional), simpan.
- Periksa daftar template; lakukan edit untuk mengubah subjek/isi; simpan.
- Hapus template contoh; konfirmasi dan pastikan template tidak ada lagi.
- Cek field updatedAt terisi/terbarui pada setiap update.
- Untuk preview: buka template dan render htmlBody secara inline (jika Anda menambahkan preview di UI). Jika belum ada, secara konseptual memvalidasi HTML rendering melalui frontend.

Kebutuhan Teknis
- Koleksi Firestore: emailTemplates
- Struktur objek: { id, key?, subject, htmlBody, variables: string[], isActive, updatedAt }

Dokumentasi Tambahan
- Patch ini mempersiapkan fase 2 untuk Email Template Manager. Patch patch berikutnya akan menghubungkan UI admin dengan kampanye dan API kampanye bila diperlukan.
