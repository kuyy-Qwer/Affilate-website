import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, MapPin, Clock, LogOut, Trash2, Shield, Smartphone, Laptop, Tablet, Globe } from 'lucide-react';
import { UserSession } from '../types';
import { useStore } from '../store/useStore';

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  return 'Unknown';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/chrome|chromium/i.test(ua) && !/edge/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Unknown Browser';
}

function getDeviceIcon(deviceInfo: string) {
  if (deviceInfo.includes('Mobile')) return Smartphone;
  if (deviceInfo.includes('Tablet')) return Tablet;
  return Laptop;
}

async function fingerprintDevice(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ];
  const msgBuffer = new TextEncoder().encode(components.join('|'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export const SessionManagement: React.FC = () => {
  const { getAuthHeaders } = useStore();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch('/api/admin/sessions', { headers });
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data);
        // Find current session
        const fingerprint = await fingerprintDevice();
        const current = data.find((s: UserSession) => 
          s.deviceInfo?.includes(fingerprint) && s.isActive
        );
        if (current) setCurrentSessionId(current.id);
      } else {
        setError('Failed to load sessions');
      }
    } catch (err: any) {
      setError('Failed to load sessions: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      if (currentSessionId) {
        updateSessionActivity(currentSessionId);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [loadSessions, currentSessionId]);

  const updateSessionActivity = async (sessionId: string) => {
    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/sessions/${sessionId}/terminate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateActivity', lastActive: new Date().toISOString() })
      });
    } catch {
      // Silently fail
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) {
      setError('Cannot revoke the current session');
      return;
    }
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      });
      if (resp.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        setSuccess('Session revoked successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to revoke session');
      }
    } catch (err: any) {
      setError('Failed to revoke session: ' + err.message);
    }
  };

  const handleRevokeAll = async () => {
    try {
      const sessionsToRevoke = sessions.filter(s => s.id !== currentSessionId);
      for (const session of sessionsToRevoke) {
        if (session.id) {
          await handleRevokeSession(session.id);
        }
      }
      setSuccess('All other sessions revoked');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to revoke sessions: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Monitor size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Active Sessions</h3>
            <p className="text-xs text-gray-500">Manage your active login sessions</p>
          </div>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeAll}
            className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center gap-1"
          >
            <LogOut size={12} />
            Revoke All Others
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">{success}</div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Monitor size={40} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No active sessions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map(session => {
            const DeviceIcon = getDeviceIcon(session.deviceInfo || '');
            const isCurrent = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isCurrent ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <DeviceIcon size={18} className={isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{session.deviceInfo || 'Unknown Device'}</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full">Current</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Globe size={10} /> {session.ipAddress || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(session.lastActive).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Revoke session"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
