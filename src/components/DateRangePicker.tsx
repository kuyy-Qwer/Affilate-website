import React, { useState } from 'react';

export function DateRangePicker({ onChange }: { onChange?: (start: string, end: string) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const commit = () => {
    if (onChange) onChange(start, end);
  };

  return (
    <div className="flex gap-2 items-center">
      <input type="date" value={start} onChange={e => { setStart(e.target.value); }} className="border rounded px-3 py-2" />
      <span className="text-gray-500">to</span>
      <input type="date" value={end} onChange={e => { setEnd(e.target.value); }} className="border rounded px-3 py-2" />
      <button onClick={commit} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
    </div>
  );
}
