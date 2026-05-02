import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function CommissionPdfReport({ data }: { data?: any[] }) {
  const generate = () => {
    const doc = new jsPDF();
    doc.text('Commission Report', 14, 20);
    const rows = (data || []).map((d, i) => [i + 1, d.product || '', d.amount || 0, d.commission || 0, d.date || '']);
    (doc as any).autoTable({ head: [['#','Product','Amount','Commission','Date']], body: rows, startY: 28 });
    doc.save('commission-report.pdf');
  };
  return (
    <div className="p-4 border rounded-xl bg-white dark:bg-gray-800 border-gray-100">
      <h4 className="font-bold mb-2">Commission PDF Report</h4>
      <p className="text-sm text-gray-600 mb-3">Generate a simple PDF report from data.</p>
      <button onClick={generate} className="px-4 py-2 bg-indigo-600 text-white rounded">Generate PDF</button>
    </div>
  );
}
