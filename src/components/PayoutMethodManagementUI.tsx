import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, Edit3, Trash2, CheckCircle, XCircle, Save, CreditCard, Building, Smartphone } from 'lucide-react';
import { PayoutMethod } from '../types';
import { useStore } from '../store/useStore';

const methodIcons: Record<string, React.ElementType> = {
  bank_transfer: Building,
  dana: Smartphone,
  ovo: Smartphone,
  gopay: Smartphone,
  paypal: CreditCard,
};

const methodColors: Record<string, string> = {
  bank_transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  dana: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  ovo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  gopay: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paypal: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function PayoutMethodManagementUI() {
  const { getAuthHeaders } = useStore();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PayoutMethod>>({
    type: 'bank_transfer',
    accountName: '',
    accountNumber: '',
    bankName: '',
    isVerified: false,
    isPrimary: false,
  });
  const [saving, setSaving] = useState(false);

  const loadMethods = useCallback(async () => {
    if (!getAuthHeaders) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/payout-methods', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setMethods(data);
      } else {
        console.error('Failed to load payout methods');
      }
    } catch (err: any) {
      console.error('Failed to load payout methods:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  const handleSubmit = async () => {
    if (!formData.accountName || !formData.accountNumber) {
      alert('Account name and number are required');
      return;
    }
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const data = {
        ...formData,
        userId: (await getAuthHeaders() as any).uid || 'current-user', // This should get user ID from context
        createdAt: new Date().toISOString(),
      };

      if (editingId) {
        const resp = await fetch(`/api/admin/payout-methods/${editingId}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('Failed to update');
      } else {
        const resp = await fetch('/api/admin/payout-methods', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!resp.ok) throw new Error('Failed to create');
      }

      await loadMethods();
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert('Failed to save payout method: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payout method?')) return;
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/payout-methods/${id}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        await loadMethods();
      } else {
        alert('Failed to delete');
      }
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const headers = await getAuthHeaders();
      // Set all others to not primary first
      const others = methods.filter(m => m.isPrimary && m.id !== id);
      for (const m of others) {
        if (m.id) {
          await fetch(`/api/admin/payout-methods/${m.id}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPrimary: false })
          });
        }
      }
      // Set this one as primary
      await fetch(`/api/admin/payout-methods/${id}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true })
      });
      await loadMethods();
    } catch (err: any) {
      alert('Failed to set primary: ' + err.message);
    }
  };

  const editMethod = (method: PayoutMethod) => {
    setEditingId(method.id);
    setFormData(method);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ type: 'bank_transfer', accountName: '', accountNumber: '', bankName: '', isVerified: false, isPrimary: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Wallet size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-black">Payout Methods</h2>
            <p className="text-xs text-gray-500">Manage your withdrawal payment methods</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}
          className="px-4 py-2 bg-[#2FA084] hover:bg-[#6FCF97] text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          Add Method
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
          <h3 className="font-bold">{editingId ? 'Edit Payout Method' : 'Add Payout Method'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Payment Type</label>
              <select
                value={formData.type || 'bank_transfer'}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as PayoutMethod['type'] }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="dana">DANA</option>
                <option value="ovo">OVO</option>
                <option value="gopay">GoPay</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Account Name</label>
              <input
                value={formData.accountName || ''}
                onChange={e => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                placeholder="Name on account"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Account Number / ID</label>
              <input
                value={formData.accountNumber || ''}
                onChange={e => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="Account number or email"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            {formData.type === 'bank_transfer' && (
              <div>
                <label className="text-sm font-semibold mb-1 block">Bank Name</label>
                <input
                  value={formData.bankName || ''}
                  onChange={e => setFormData(prev => ({ ...prev, bankName: e.target.value }))}
                  placeholder="e.g., BCA, Mandiri, BNI"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPrimary || false}
              onChange={e => setFormData(prev => ({ ...prev, isPrimary: e.target.checked }))}
              id="isPrimary"
            />
            <label htmlFor="isPrimary" className="text-sm">Set as primary method</label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 py-2.5 border rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-[#2FA084] hover:bg-[#6FCF97] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
        </div>
      ) : methods.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-12 text-center">
          <Wallet size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No payout methods added</p>
          <p className="text-xs text-gray-400 mt-1">Add a payment method to receive withdrawals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map(method => {
            const Icon = methodIcons[method.type] || Wallet;
            return (
              <div key={method.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${methodColors[method.type]}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold">{method.type.replace('_', ' ').toUpperCase()}</h4>
                      {method.isPrimary && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> Primary
                        </span>
                      )}
                      {method.isVerified ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <XCircle size={10} /> Pending
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">{method.accountName}</span>
                      <span className="mx-2">•</span>
                      <span className="font-mono">{method.accountNumber}</span>
                      {method.bankName && <span className="mx-2">•</span>}
                      {method.bankName && <span>{method.bankName}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!method.isPrimary && (
                    <button onClick={() => handleSetPrimary(method.id!)} className="px-3 py-1.5 border rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all" title="Set as primary">
                      Set Primary
                    </button>
                  )}
                  <button onClick={() => editMethod(method)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(method.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
