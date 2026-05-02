Phase 2 MVP - Announcement/Banner System (2.6)

Tujuan
- Mengelola banners/pengumuman situs untuk promo, update penting, dan komunikasi ke pengguna afiliasi/customers/admin.

Acceptance Criteria
- Create Banner: title, message, type (info/warning/success/promo), isActive, startDate, endDate, targetAudience.
- Read: daftar banner ditampilkan dengan metadata utama (title, type, isActive, date range).
- Update: bisa mengubah banner; updatedAt/aktifitas banner tercatat.
- Delete: banner dapat dihapus.
- Render: banner aktif ditampilkan di header/home (simple rendering untuk MVP).

Testing Manual
- Buka AdminDashboard > Announcements.
- Buat banner baru; set type, tanggal mulai/berakhir, isActive.
- Simpan; cek banner muncul di daftar dan render di frontend ketika aktif.
- Nonaktifkan banner; verifikasi banner tidak tampil di frontend.

Kebutuhan Teknis
- Koleksi Firestore: banners (atau di tempat sejenis dengan field isActive, type, startDate, endDate, title, message).
- Render Frontend: header/home menampilkan banner saat isActive dan current date berada dalam rentang startDate-endDate.

Dokumentasi Tambahan
- Patch Phase 2 ini menyediakan basis untuk Announcements. Selanjutnya bisa ditautkan ke komponent frontend untuk rendering secara visual.
