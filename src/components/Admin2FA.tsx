import React, { useState } from 'react';

export function Admin2FA() {
  const [enabled, setEnabled] = useState<boolean>(localStorage.getItem('admin_2fa') === 'true');

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('admin_2fa', String(next));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <strong>2FA Admin</strong>
        <span className="text-xs text-gray-500">Beta</span>
      </div>
      <p className="text-sm text-gray-600 mb-3">Keamanan login admin dengan 2FA (Beta). Konfigurasi lebih lanjut diperlukan backend MFA provider.</p>
      <button onClick={toggle} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">
        {enabled ? 'Disable 2FA' : 'Enable 2FA'}
      </button>
    </div>
  );
}
