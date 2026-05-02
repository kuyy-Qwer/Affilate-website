import React from 'react';
import { GDPRCookieConsent } from '../components/GDPRCookieConsent';
import { Admin2FA } from '../components/Admin2FA';
import { SessionManagement } from '../components/SessionManagement';
import { AuditLogsEnhanced } from '../components/AuditLogsEnhanced';

// Phase 4 MVP page aggregating all Phase 4 components
export const Phase4Page: React.FC = () => {
  return (
    <div className="p-4 space-y-4">
      <GDPRCookieConsent />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <Admin2FA />
        <SessionManagement />
      </div>
      <AuditLogsEnhanced />
    </div>
  );
};

export default Phase4Page;
