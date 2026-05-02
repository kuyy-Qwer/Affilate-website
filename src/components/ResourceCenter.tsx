import React from 'react';

export function ResourceCenter() {
  const resources = [
    { id: 'r1', title: 'Afiliasi 101', type: 'guide', content: 'Panduan dasar program afiliasi.' },
    { id: 'r2', title: 'Best Practices', type: 'tip', content: 'Tips untuk meningkatkan konversi.' },
  ];
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
      <h4 className="font-bold mb-2">Resource Center</h4>
      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
        {resources.map(r => (
          <li key={r.id}>{r.title} - {r.content}</li>
        ))}
      </ul>
    </div>
  );
}
