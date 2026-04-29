/**
 * Script to initialize affiliate configuration in Firestore
 * Run with: npx tsx scripts/initializeAffiliateConfig.ts
 */

import admin from 'firebase-admin';
import { AffiliateConfig } from '../src/types.js';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

const defaultConfig: Omit<AffiliateConfig, 'id'> = {
  // Cookie & Attribution
  defaultCookieLifeDays: 30,
  multiTouchAttributionEnabled: false,
  attributionModel: 'last-click',
  
  // Payout Settings
  defaultPayoutHoldingDays: 14,
  minPayoutAmount: 50000, // Rp 50,000
  
  // Anti-Fraud Settings
  selfReferralBlocked: true,
  fraudDetectionEnabled: true,
  maxClicksPerIpPerHour: 100
};

async function initializeAffiliateConfig() {
  console.log('🚀 Initializing affiliate configuration...\n');
  
  try {
    const configRef = db.collection('settings').doc('affiliate_config');
    
    // Check if config already exists
    const configDoc = await configRef.get();
    
    if (configDoc.exists) {
      console.log('⏭️  Affiliate config already exists, updating...');
      await configRef.update({
        ...defaultConfig,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Affiliate config updated successfully!');
    } else {
      await configRef.set({
        id: 'affiliate_config',
        ...defaultConfig,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Affiliate config created successfully!');
    }
    
    // Display summary
    console.log('\n📊 Affiliate Configuration Summary:');
    console.log('┌────────────────────────────────────┬──────────────┐');
    console.log('│ Setting                            │ Value        │');
    console.log('├────────────────────────────────────┼──────────────┤');
    console.log(`│ Default Cookie Life                │ ${defaultConfig.defaultCookieLifeDays} days      │`);
    console.log(`│ Payout Holding Period              │ ${defaultConfig.defaultPayoutHoldingDays} days      │`);
    console.log(`│ Min Payout Amount                  │ Rp ${defaultConfig.minPayoutAmount.toLocaleString('id-ID').padEnd(6)} │`);
    console.log(`│ Self-Referral Blocked              │ ${defaultConfig.selfReferralBlocked ? 'Yes' : 'No'}          │`);
    console.log(`│ Fraud Detection                    │ ${defaultConfig.fraudDetectionEnabled ? 'Enabled' : 'Disabled'}     │`);
    console.log(`│ Max Clicks/IP/Hour                 │ ${defaultConfig.maxClicksPerIpPerHour.toString().padEnd(12)} │`);
    console.log(`│ Multi-Touch Attribution            │ ${defaultConfig.multiTouchAttributionEnabled ? 'Enabled' : 'Disabled'}     │`);
    console.log(`│ Attribution Model                  │ ${defaultConfig.attributionModel.padEnd(12)} │`);
    console.log('└────────────────────────────────────┴──────────────┘');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review and adjust settings via Firestore Console');
    console.log('2. Test anti-fraud features');
    console.log('3. Monitor click patterns for suspicious activity');
    console.log('4. Configure tier-specific cookie durations');
    
  } catch (error) {
    console.error('❌ Error initializing affiliate config:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
initializeAffiliateConfig();
