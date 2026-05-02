import React, { useState, useEffect, useCallback } from 'react';
import { Shield, QrCode, Copy, Check, AlertTriangle, RefreshCw, Trash2, Key } from 'lucide-react';
import { useStore } from '../store/useStore';

function base32Encode(data: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 31];
  }
  return result;
}

async function generateSecret(): Promise<{ secret: string; secretBytes: Uint8Array }> {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return { secret: base32Encode(bytes), secretBytes: bytes };
}

async function hmacSHA1(key: Uint8Array, message: Uint8Array): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', cryptoKey, message);
}

async function generateTOTP(secret: string, period: number = 30, digits: number = 6): Promise<string> {
  const secretBytes = Uint8Array.from(secret, c => c.charCodeAt(0));
  const epoch = Math.floor(Date.now() / 1000);
  const time = Math.floor(epoch / period);
  const timeBytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = time & 0xff;
  }

  const hmac = new Uint8Array(await hmacSHA1(secretBytes, timeBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

function generateQRUrl(secret: string, accountName: string, issuer: string = 'DigiSell'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < count; i++) {
    let code = '';
    const codeBytes = new Uint8Array(6);
    crypto.getRandomValues(codeBytes);
    for (const byte of codeBytes) {
      code += chars[byte % chars.length];
    }
    codes.push(code);
  }
  return codes;
}

interface TwoFAData {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  usedBackupCodes?: string[];
  enabledAt?: string;
}

export const Admin2FA: React.FC = () => {
  const { getAuthHeaders, user } = useStore();
  const [twoFAData, setTwoFAData] = useState<TwoFAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupPhase, setSetupPhase] = useState<'idle' | 'show-qr' | 'verify' | 'show-backup'>('idle');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [currentTOTP, setCurrentTOTP] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [disableCode, setDisableCode] = useState('');

  const loadTwoFAData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/2fa?userId=${user.uid}`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        setTwoFAData(data);
      } else {
        console.error('Failed to load 2FA data');
      }
    } catch (err) {
      console.error('Failed to load 2FA data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => { loadTwoFAData(); }, [loadTwoFAData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const epoch = Math.floor(Date.now() / 1000);
      setTimeRemaining(30 - (epoch % 30));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (setupPhase === 'show-qr' && secret) {
      generateTOTP(secret).then(setCurrentTOTP);
      const interval = setInterval(() => {
        generateTOTP(secret).then(setCurrentTOTP);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [setupPhase, secret]);

  const handleEnable2FA = async () => {
    if (!user?.uid) return;
    setError('');
    try {
      const { secret: newSecret } = await generateSecret();
      setSecret(newSecret);
      setSetupPhase('show-qr');
    } catch (err) {
      setError('Failed to generate 2FA secret');
    }
  };

  const handleVerifyAndActivate = async () => {
    if (!user?.uid || !secret) return;
    setError('');
    try {
      const expected = await generateTOTP(secret);
      if (verificationCode !== expected) {
        setError('Invalid code. Please check and try again.');
        return;
      }

      const codes = generateBackupCodes();
      const twoFAData: TwoFAData = {
        enabled: true,
        secret,
        backupCodes: codes,
        usedBackupCodes: [],
        enabledAt: new Date().toISOString(),
      };

      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/2fa/${user.uid}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(twoFAData)
      });

      if (resp.ok) {
        setTwoFAData(twoFAData);
        setBackupCodes(codes);
        setSetupPhase('show-backup');
        setSuccess('2FA enabled successfully! Save your backup codes.');
      } else {
        setError('Failed to activate 2FA');
      }
    } catch (err: any) {
      setError('Failed to activate 2FA: ' + err.message);
    }
  };

  const handleDisable2FA = async () => {
    if (!user?.uid || !twoFAData?.secret) return;
    setError('');
    try {
      const expected = await generateTOTP(twoFAData.secret);
      const isBackupCode = twoFAData.backupCodes?.includes(disableCode) && 
        !twoFAData.usedBackupCodes?.includes(disableCode);

      if (disableCode !== expected && !isBackupCode) {
        setError('Invalid 2FA code or backup code');
        return;
      }

      const updatedData: Partial<TwoFAData> = { enabled: false };
      if (isBackupCode && twoFAData.usedBackupCodes) {
        updatedData.usedBackupCodes = [...twoFAData.usedBackupCodes, disableCode];
      }

      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/2fa/${user.uid}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });

      if (resp.ok) {
        setTwoFAData({ enabled: false } as TwoFAData);
        setSetupPhase('idle');
        setDisableCode('');
        setSuccess('2FA disabled successfully');
      } else {
        setError('Failed to disable 2FA');
      }
    } catch (err: any) {
      setError('Failed to disable 2FA: ' + err.message);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!user?.uid || !twoFAData?.secret) return;
    try {
      const codes = generateBackupCodes();
      const updated: TwoFAData = { ...twoFAData, backupCodes: codes, usedBackupCodes: [] };
      
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/2fa/${user.uid}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupCodes: codes, usedBackupCodes: [] })
      });

      if (resp.ok) {
        setTwoFAData(updated);
        setBackupCodes(codes);
        setSuccess('Backup codes regenerated. Old codes are now invalid.');
      } else {
        setError('Failed to regenerate backup codes');
      }
    } catch (err: any) {
      setError('Failed to regenerate backup codes: ' + err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-72"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <Shield size={20} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Two-Factor Authentication (2FA)</h3>
          <p className="text-xs text-gray-500">Add an extra layer of security to your admin account</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          <Check size={16} />
          {success}
        </div>
      )}

      {!twoFAData?.enabled && setupPhase === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold">2FA is currently disabled</p>
                <p className="mt-1">Enabling 2FA will require you to enter a verification code from your authenticator app each time you log in.</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleEnable2FA}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <Shield size={18} />
            Enable 2FA
          </button>
        </div>
      )}

      {setupPhase === 'show-qr' && secret && (
        <div className="space-y-4">
          <h4 className="font-bold">Step 1: Scan QR Code</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Scan this QR code with Google Authenticator, Authy, or any TOTP app.
          </p>
          <div className="p-4 bg-white border rounded-lg flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateQRUrl(secret, user?.email || 'admin@digisell.com'))}`}
              alt="2FA QR Code"
              className="w-48 h-48"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Or enter this secret manually:</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg font-mono text-sm">{secret}</code>
              <button onClick={() => copyToClipboard(secret)} className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                {copiedCode ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          <button onClick={() => setSetupPhase('verify')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
            Next: Verify Setup
          </button>
        </div>
      )}

      {setupPhase === 'verify' && (
        <div className="space-y-4">
          <h4 className="font-bold">Step 2: Verify Code</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app.
          </p>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg">
            <Key size={16} className="text-gray-500" />
            <span className="font-mono text-lg font-bold">{currentTOTP}</span>
            <span className="text-xs text-gray-500 ml-auto">Refreshes in {timeRemaining}s</span>
          </div>
          <input
            type="text"
            value={verificationCode}
            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="w-full p-3 border rounded-lg font-mono text-lg text-center tracking-widest"
          />
          <div className="flex gap-2">
            <button onClick={() => setSetupPhase('show-qr')} className="flex-1 py-3 border rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              Back
            </button>
            <button onClick={handleVerifyAndActivate} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all">
              Verify & Activate
            </button>
          </div>
        </div>
      )}

      {setupPhase === 'show-backup' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold">Save these backup codes!</p>
                <p className="mt-1">Each code can only be used once. Store them in a safe place.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 border rounded">
                <code className="font-mono text-xs">{code}</code>
                <button onClick={() => copyToClipboard(code)} className="text-gray-400 hover:text-gray-600">
                  <Copy size={14} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => { setSetupPhase('idle'); setSuccess(''); }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all">
            Done
          </button>
        </div>
      )}

      {twoFAData?.enabled && setupPhase === 'idle' && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">2FA is enabled</span>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              Enabled on {new Date(twoFAData.enabledAt!).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 border rounded-lg">
            <Key size={16} className="text-gray-500" />
            <span className="font-mono text-lg font-bold">{currentTOTP}</span>
            <span className="text-xs text-gray-500 ml-auto">Refreshes in {timeRemaining}s</span>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Key size={14} />
              Backup Codes ({twoFAData.backupCodes?.length || 0} remaining)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {twoFAData.backupCodes
                ?.filter(c => !twoFAData.usedBackupCodes?.includes(c))
                .slice(0, 4)
                .map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 border rounded">
                    <code className="font-mono text-xs">{code}</code>
                    <button onClick={() => copyToClipboard(code)} className="text-gray-400 hover:text-gray-600">
                      <Copy size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleRegenerateBackupCodes} className="flex-1 py-2.5 border rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
              <RefreshCw size={14} />
              Regenerate Codes
            </button>
            <button onClick={() => setSetupPhase('disable')} className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2">
              <Trash2 size={14} />
              Disable 2FA
            </button>
          </div>
        </div>
      )}

      {setupPhase === 'disable' && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-300">
                <p className="font-semibold">Disable 2FA</p>
                <p className="mt-1">Enter your current 2FA code or a backup code to confirm.</p>
              </div>
            </div>
          </div>
          <input
            type="text"
            value={disableCode}
            onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Enter 2FA or backup code"
            maxLength={6}
            className="w-full p-3 border rounded-lg font-mono text-lg text-center tracking-widest"
          />
          <div className="flex gap-2">
            <button onClick={() => { setSetupPhase('idle'); setDisableCode(''); }} className="flex-1 py-3 border rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              Cancel
            </button>
            <button onClick={handleDisable2FA} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all">
              Confirm Disable
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { generateTOTP, generateBackupCodes, generateSecret };
export type { TwoFAData };
