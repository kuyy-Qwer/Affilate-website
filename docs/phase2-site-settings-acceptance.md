Phase 2 MVP - Site Settings Dashboard (2.5)

Tujuan
- Menyediakan UI terpusat untuk mengelola global site config: branding (logo, site name), SEO defaults (meta title, meta description), dan pengaturan terkait lainnya.

Acceptance Criteria
- UI Settings: able to edit siteName, logoUrl, metaTitle, metaDesc.
- Persist: settings disimpan ke Firestore (settings/global) dengan fields siteName, logoUrl, metaTitle, metaDesc.
- Reload/Render: perubahan terlihat di frontend tanpa perlu rebuild.
- Akses: hanya user dengan hak admin dapat mengakses halaman Settings.

Testing Manual
- Buka AdminDashboard > Site Settings.
- Ubah Site Name, Logo URL, Meta Title, Meta Description; simpan.
- Reload halaman; pastikan nilai baru tampil di UI frontend (SEO tag bisa dicek via Helmet meta kisaran belakang situs, atau di kepala HTML).
- Coba setting kosong/invalid untuk melihat validasi/handling (jika ada).

Kebutuhan Teknis
- Koleksi Firestore: settings
- Document: global (id: 'global') dengan fields: siteName, logoUrl, metaTitle, metaDesc, updatedAt.

Dokumentasi Tambahan
- Patch 2.5 ini fokus pada implementasi UI dan persistence. Kita bisa menambah test UI/UT jika diperlukan.
