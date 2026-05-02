import React, { useState } from 'react';

type Notif = { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string };

export function NotificationCenter() {
  const [notifs, setNotifs] = useState<Notif[]>([
    { id: 'n1', type: 'commission_earned', title: 'Komisi masuk', message: 'Anda menerima komisi baru', isRead: false, createdAt: new Date().toISOString() },
  ]);

  const markRead = (id: string) => setNotifs(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 max-w-md">
      <div className="flex items-center justify-between mb-2">
        <strong>Notifikasi</strong>
        <span className="text-xs text-gray-500">{notifs.filter(n => !n.isRead).length} unread</span>
      </div>
      <div className="divide-y">
        {notifs.map(n => (
          <div key={n.id} className="py-2 flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold">{n.title}</div>
              <div className="text-xs text-gray-500">{n.message}</div>
            </div>
            <button onClick={() => markRead(n.id)} className="text-xs text-gray-400">Mark read</button>
          </div>
        ))}
      </div>
    </div>
  );
}
