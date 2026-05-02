import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, Edit3, Trash2, CheckCircle, XCircle, Save, X, Shield, Clock, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { Tier } from '../types';

const PAYOUT_COLORS: Record<string, string> = {
  standard: 'bg-blue-100 text-blue-700',
  priority: 'bg-amber-100 text-amber-700',
  instant: 'bg-green-100 text-green-700',
};

export function TierManagementUI() {
  const { getAuthHeaders } = useStore();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Tier>>({
    name: '',
    displayName: '',
    commissionRate: 0,
    minSales: 0,
    maxSales: null,
    color: '#2FA084',
    icon: '🏆',
    benefits: [],
    isActive: true,
    order: 0,
    cookieLifeDays: 30,
    payoutPriority: 'standard',
    payoutHoldingDays: 14,
  });
  const [benefitInput, setBenefitInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTiers = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/admin/tiers', { headers: await getAuthHeaders() });
      if (!resp.ok) throw new Error('Failed to load tiers');
      const data = await resp.json();
      setTiers(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.displayName) {
      alert('Tier name and display name are required');
      return;
    }
    setSaving(true);
    try {
      const tierData = {
        ...formData,
        createdAt: formData.createdAt || new Date().toISOString(),
      };
      const resp = await fetch(`/api/admin/tiers/${formData.name}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(tierData),
      });
      if (!resp.ok) throw new Error('Failed to save tier');
      await loadTiers();
      setShowForm(false);
      setEditingTier(null);
      resetForm();
    } catch (err: any) {
      alert('Failed to save tier: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm('Delete this tier? This cannot be undone.')) return;
    try {
      const resp = await fetch(`/api/admin/tiers/${tierId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!resp.ok) throw new Error('Failed to delete tier');
      await loadTiers();
    } catch (err: any) {
      alert('Failed to delete tier: ' + err.message);
    }
  };

  const handleToggleActive = async (tier: Tier) => {
    try {
      await fetch(`/api/admin/tiers/${tier.id}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ ...tier, isActive: !tier.isActive }),
      });
      await loadTiers();
    } catch (err: any) {
      alert('Failed to update tier: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', displayName: '', commissionRate: 0, minSales: 0, maxSales: null,
      color: '#2FA084', icon: '🏆', benefits: [], isActive: true, order: 0,
      cookieLifeDays: 30, payoutPriority: 'standard', payoutHoldingDays: 14,
    });
    setBenefitInput('');
  };

  const editTier = (tier: Tier) => {
    setEditingTier(tier);
    setFormData(tier);
    setShowForm(true);
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setFormData(prev => ({ ...prev, benefits: [...(prev.benefits || []), benefitInput.trim()] }));
      setBenefitInput('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Layers size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-black">Tier Management</h2>
            <p className="text-xs text-gray-500">Manage affiliate tiers, commission rates, and benefits</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setEditingTier(null); setShowForm(true); }}
          className="px-4 py-2 bg-[#2FA084] hover:bg-[#6FCF97] text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
        >
          <Plus size={16} />
          Add Tier
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
          <h3 className="font-bold">{editingTier ? 'Edit Tier' : 'Create New Tier'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Tier ID (slug)</label>
              <input
                value={formData.name || ''}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                placeholder="starter, bronze, gold..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
                disabled={!!editingTier}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Display Name</label>
              <input
                value={formData.displayName || ''}
                onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Starter, Bronze, Gold..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Commission Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.commissionRate || 0}
                onChange={e => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Minimum Sales</label>
              <input
                type="number"
                min="0"
                value={formData.minSales || 0}
                onChange={e => setFormData(prev => ({ ...prev, minSales: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Maximum Sales (0 = unlimited)</label>
              <input
                type="number"
                min="0"
                value={formData.maxSales || 0}
                onChange={e => setFormData(prev => ({ ...prev, maxSales: parseInt(e.target.value) || null }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Order (sort)</label>
              <input
                type="number"
                min="0"
                value={formData.order || 0}
                onChange={e => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Cookie Life (days)</label>
              <input
                type="number"
                min="1"
                value={formData.cookieLifeDays || 30}
                onChange={e => setFormData(prev => ({ ...prev, cookieLifeDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Payout Holding (days)</label>
              <input
                type="number"
                min="0"
                value={formData.payoutHoldingDays || 14}
                onChange={e => setFormData(prev => ({ ...prev, payoutHoldingDays: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Payout Priority</label>
              <select
                value={formData.payoutPriority || 'standard'}
                onChange={e => setFormData(prev => ({ ...prev, payoutPriority: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="standard">Standard</option>
                <option value="priority">Priority</option>
                <option value="instant">Instant</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Color</label>
              <input
                type="color"
                value={formData.color || '#2FA084'}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 px-1 py-1 border rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Benefits</label>
            <div className="flex gap-2">
              <input
                value={benefitInput}
                onChange={e => setBenefitInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                placeholder="Add a benefit..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button onClick={addBenefit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(formData.benefits || []).map((b, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs flex items-center gap-1">
                  {b}
                  <button onClick={() => setFormData(prev => ({ ...prev, benefits: prev.benefits?.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700"><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setEditingTier(null); }} className="flex-1 py-2.5 border rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-[#2FA084] hover:bg-[#6FCF97] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {saving ? <Clock size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Tier'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="space-y-3">
          {tiers.map(tier => (
            <div key={tier.id} className="bg-white dark:bg-gray-800 rounded-xl border p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: tier.color + '20', color: tier.color }}>
                  {tier.icon || '🏆'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold">{tier.displayName}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tier.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tier.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAYOUT_COLORS[tier.payoutPriority || 'standard']}`}>
                      {tier.payoutPriority || 'standard'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Commission: {(tier.commissionRate * 100).toFixed(1)}%</span>
                    <span>Min Sales: {tier.minSales}</span>
                    <span>Cookie: {tier.cookieLifeDays || 30}d</span>
                    <span>Holding: {tier.payoutHoldingDays || 14}d</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleToggleActive(tier)} className={`p-2 rounded-lg transition-all ${tier.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`} title={tier.isActive ? 'Deactivate' : 'Activate'}>
                  {tier.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                </button>
                <button onClick={() => editTier(tier)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit3 size={18} /></button>
                <button onClick={() => handleDelete(tier.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
