import React, { useEffect, useState, useCallback } from 'react';
import { X, Shield, Settings, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface CookieCategory {
  id: string;
  name: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

interface ConsentRecord {
  accepted: boolean;
  timestamp: string;
  consentId: string;
  categories: Record<string, boolean>;
  version: string;
}

const COOKIE_VERSION = '1.0.0';
const CONSENT_STORAGE_KEY = 'gdpr_consent_record';

const DEFAULT_CATEGORIES: CookieCategory[] = [
  {
    id: 'necessary',
    name: 'Necessary Cookies',
    description: 'Required for basic functionality like authentication and security. Cannot be disabled.',
    required: true,
    enabled: true,
  },
  {
    id: 'analytics',
    name: 'Analytics Cookies',
    description: 'Help us understand how visitors interact with our website by collecting anonymous usage data.',
    required: false,
    enabled: false,
  },
  {
    id: 'marketing',
    name: 'Marketing Cookies',
    description: 'Used to deliver relevant advertisements and track the effectiveness of our marketing campaigns.',
    required: false,
    enabled: false,
  },
  {
    id: 'preferences',
    name: 'Preference Cookies',
    description: 'Remember your settings like language, region, and UI preferences.',
    required: false,
    enabled: false,
  },
];

function generateConsentId(): string {
  return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getStoredConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const record: ConsentRecord = JSON.parse(raw);
    if (record.version !== COOKIE_VERSION) return null;
    return record;
  } catch {
    return null;
  }
}

function saveConsent(record: ConsentRecord): void {
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
}

function applyCookiePreferences(categories: Record<string, boolean>): void {
  if (!categories.analytics) {
    document.querySelectorAll('script[data-category="analytics"]').forEach(el => el.remove());
  }
  if (!categories.marketing) {
    document.querySelectorAll('script[data-category="marketing"]').forEach(el => el.remove());
  }
}

export const GDPRCookieConsent: React.FC = () => {
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>(DEFAULT_CATEGORIES);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setConsent(stored);
      applyCookiePreferences(stored.categories);
    } else {
      setBannerVisible(true);
    }
  }, []);

  const toggleCategory = useCallback((id: string) => {
    setCategories(prev =>
      prev.map(c => (c.id === id && !c.required ? { ...c, enabled: !c.enabled } : c))
    );
  }, []);

  const handleAcceptAll = useCallback(() => {
    const record: ConsentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      consentId: generateConsentId(),
      categories: { necessary: true, analytics: true, marketing: true, preferences: true },
      version: COOKIE_VERSION,
    };
    saveConsent(record);
    setConsent(record);
    setBannerVisible(false);
    applyCookiePreferences(record.categories);
  }, []);

  const handleRejectAll = useCallback(() => {
    const record: ConsentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      consentId: generateConsentId(),
      categories: { necessary: true, analytics: false, marketing: false, preferences: false },
      version: COOKIE_VERSION,
    };
    saveConsent(record);
    setConsent(record);
    setBannerVisible(false);
    applyCookiePreferences(record.categories);
  }, []);

  const handleSavePreferences = useCallback(() => {
    const cats: Record<string, boolean> = {};
    categories.forEach(c => { cats[c.id] = c.enabled; });
    const record: ConsentRecord = {
      accepted: true,
      timestamp: new Date().toISOString(),
      consentId: generateConsentId(),
      categories: cats,
      version: COOKIE_VERSION,
    };
    saveConsent(record);
    setConsent(record);
    setBannerVisible(false);
    setShowPreferences(false);
    applyCookiePreferences(cats);
  }, [categories]);

  const handleWithdrawConsent = useCallback(() => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setConsent(null);
    setCategories(DEFAULT_CATEGORIES);
    setBannerVisible(true);
  }, []);

  if (consent && !bannerVisible) {
    return (
      <button
        onClick={() => { setBannerVisible(true); setShowPreferences(false); }}
        className="fixed bottom-4 left-4 z-[9998] flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
        aria-label="Manage cookie preferences"
      >
        <Shield size={14} />
        Cookie Settings
      </button>
    );
  }

  if (!bannerVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
      <div className="bg-gray-900 dark:bg-gray-950 text-white shadow-2xl border-t border-gray-800">
        {!showPreferences ? (
          <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Shield size={24} className="text-[#6FCF97] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">We Value Your Privacy</h3>
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    We use cookies to enhance your experience, analyze traffic, and for marketing purposes.
                    You can customize your preferences or accept all. Read our{' '}
                    <a href="/?page=privacy" className="text-[#6FCF97] hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all"
                >
                  <Settings size={14} />
                  Customize
                </button>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2.5 bg-[#2FA084] hover:bg-[#6FCF97] rounded-lg text-sm font-bold transition-all"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Settings size={20} />
                Cookie Preferences
              </h3>
              <button onClick={() => setShowPreferences(false)} className="p-1 hover:bg-gray-800 rounded-lg transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {categories.map(cat => (
                <div key={cat.id} className="bg-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{cat.name}</h4>
                        {cat.required && (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-[10px] font-bold uppercase rounded-full">Required</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{cat.description}</p>
                    </div>
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      disabled={cat.required}
                      className={`ml-4 w-12 h-6 rounded-full transition-all relative flex-shrink-0 ${
                        cat.enabled ? 'bg-[#2FA084]' : 'bg-gray-600'
                      } ${cat.required ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cat.enabled ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2.5 border border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-800 transition-all"
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-2.5 bg-[#2FA084] hover:bg-[#6FCF97] rounded-lg text-sm font-bold transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { getStoredConsent, saveConsent, COOKIE_VERSION };
export type { ConsentRecord, CookieCategory };
