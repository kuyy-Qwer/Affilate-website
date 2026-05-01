import React, { useEffect, useState } from 'react';

export function GDPRCookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem('gdpr_consent');
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('gdpr_consent', 'true');
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 9999 }}>
      <div className="p-4 bg-white shadow rounded-xl border border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span role="img" aria-label="cookie">🍪</span>
          Kami menggunakan cookies untuk pengalaman terbaik. Pelajari lebih lanjut dalam kebijakan privasi.
        </div>
        <button onClick={accept} className="px-4 py-2 bg-indigo-600 text-white rounded">Setuju</button>
      </div>
    </div>
  );
}
