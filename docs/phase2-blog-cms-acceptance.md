Phase 2 MVP - Blog CMS (2.1)

Tujuan
- Menyediakan CMS blog yang memungkinkan pembuatan, pembaruan, publikasi, dan optimisasi SEO per-post. Patch ini juga menyiapkan basis data Firestore untuk blogPosts.

Acceptance Criteria
- Create Post: Pengguna dapat membuat postingan dengan judul, slug (otomatis jika kosong), konten, excerpt, coverImage, tags, seoTitle, seoDescription, dan status (draft/published).
- Read: Postingan yang ada ditampilkan dalam daftar dengan judul, status, createdAt, dan opsi edit/delete. Detail post bisa dilihat/diubah melalui form edit.
- Update: Pengguna dapat mengubah judul, slug, konten, excerpt, coverImage, tags, SEO fields, dan status; updatedAt terupdate.
- Delete: Postingan bisa dihapus dari daftar dan dihapus dari Firestore.
- SEO: SEO fields per-post tersimpan dan dapat digunakan untuk rendering metadata di frontend (SEO-ready).
- Publish Flow: Pengguna dapat mengubah status postingan antara draft dan published; UI mencerminkan status.
- Integrasi data: Semua data disimpan di koleksi blogPosts dengan fields: id, title, slug, content, excerpt, coverImage, authorId, authorName, status, createdAt, updatedAt, tags, seoTitle, seoDescription.

Testing Manual
- Langkah 1: Buka AdminDashboard > Blog.
- Langkah 2: Buat postingan baru dengan judul, konten, dan SEO fields; biarkan slug kosong untuk test slug otomatis.
- Langkah 3: Simpan; verifikasi postingan muncul di daftar dengan status default (draft).
- Langkah 4: Ubah status menjadi published; simpan; pastikan status berubah di UI.
- Langkah 5: Edit postingan (ubah title/SEO/slug); simpan; pastikan updatedAt berubah dan slug tetap konsisten dengan konten.
- Langkah 6: Hapus postingan; konfirmasi; postingan hilang dari daftar.
- Langkah 7: Periksa data di Firestore (blogPosts) untuk field: seoTitle, seoDescription, slug, createdAt, updatedAt.

Keterangan Teknis
- Koleksi Firestore: blogPosts
- Fields (opsional jadi null jika tidak diisi): seoTitle, seoDescription, tags (array), coverImage, excerpt, authorId, authorName, createdAt, updatedAt
- Slug generation: otomatis jika kosong pada penyimpanan postingan

Rollback/Notes
- Jika diperlukan rollback, nonaktifkan Blog tab di AdminDashboard atau hapus BlogManager dari wiring UI. Data yang telah dibuat tetap ada di Firestore hingga dihapus secara eksplisit.

Dokumentasi tambahan
- Patch ini menyiapkan landasan Phase 2 untuk Blog CMS. Nantinya akan diiringi dengan test suite (Vitest/Jest) dan PR terpisah untuk Phase 2 lainnya.
- Patch: 2.4 Email Template Manager (Blog 2.4) will be patch separate under phase 2
