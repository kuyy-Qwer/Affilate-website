/**
 * Script to update existing tiers with professional features
 * Run with: npx tsx scripts/updateTiersWithProfessionalFeatures.ts
 */

import admin from 'firebase-admin';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

const tierUpdates = {
  starter: {
    cookieLifeDays: 30,
    payoutPriority: 'standard' as const,
    payoutHoldingDays: 14,
    benefits: [
      'Dashboard Dasar',
      '5% Komisi',
      '1 Link Referal',
      'Materi LMS Dasar',
      'Cookie 30 hari',
      'Holding 14 hari'
    ]
  },
  bronze: {
    cookieLifeDays: 45,
    payoutPriority: 'standard' as const,
    payoutHoldingDays: 10,
    benefits: [
      'Dashboard Pro',
      '10% Komisi',
      'Unlimited Links',
      'Akses Full LMS',
      'Marketing Kit Dasar',
      'Cookie 45 hari',
      'Holding 10 hari'
    ]
  },
  silver: {
    cookieLifeDays: 60,
    payoutPriority: 'standard' as const,
    payoutHoldingDays: 7,
    benefits: [
      'Semua fitur Bronze',
      '15% Komisi',
      'Marketing Kit Premium',
      'Email Support',
      'Badge Silver di Profil',
      'Cookie 60 hari',
      'Holding 7 hari'
    ]
  },
  gold: {
    cookieLifeDays: 90,
    payoutPriority: 'priority' as const,
    payoutHoldingDays: 3,
    benefits: [
      'Semua fitur Silver',
      '20% Komisi',
      'Custom Branding',
      'Priority Support',
      'Webinar Eksklusif',
      'Badge Gold di Profil',
      'Cookie 90 hari',
      'Priority Payout (24 jam)'
    ]
  },
  diamond: {
    cookieLifeDays: 120,
    payoutPriority: 'instant' as const,
    payoutHoldingDays: 0,
    benefits: [
      'Semua fitur Gold',
      '30% Komisi',
      'API Access',
      'Dedicated Account Manager',
      'Custom Commission Deals',
      'Featured di Homepage',
      'Badge Diamond di Profil',
      'Cookie 120 hari',
      'Instant Payout (Real-time)'
    ]
  }
};

async function updateTiers() {
  console.log('🚀 Updating tiers with professional features...\n');
  
  try {
    const batch = db.batch();
    let updateCount = 0;
    
    for (const [tierId, updates] of Object.entries(tierUpdates)) {
      const tierRef = db.collection('tiers').doc(tierId);
      
      // Check if tier exists
      const tierDoc = await tierRef.get();
      
      if (tierDoc.exists) {
        batch.update(tierRef, {
          ...updates,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Queued update for tier: ${tierId}`);
        console.log(`   - Cookie Life: ${updates.cookieLifeDays} days`);
        console.log(`   - Payout Priority: ${updates.payoutPriority}`);
        console.log(`   - Holding Period: ${updates.payoutHoldingDays} days\n`);
        updateCount++;
      } else {
        console.log(`⚠️  Tier "${tierId}" not found, skipping...`);
      }
    }
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✨ Successfully updated ${updateCount} tiers!`);
    } else {
      console.log('\n⚠️  No tiers were updated.');
    }
    
    // Display summary table
    console.log('\n📊 Updated Tier Features:');
    console.log('┌───────────┬──────────┬──────────────┬──────────────┬──────────────┐');
    console.log('│ Tier      │ Cookie   │ Holding      │ Payout       │ Commission   │');
    console.log('├───────────┼──────────┼──────────────┼──────────────┼──────────────┤');
    console.log('│ Starter   │ 30 days  │ 14 days      │ Standard     │ 5%           │');
    console.log('│ Bronze    │ 45 days  │ 10 days      │ Standard     │ 10%          │');
    console.log('│ Silver    │ 60 days  │ 7 days       │ Standard     │ 15%          │');
    console.log('│ Gold      │ 90 days  │ 3 days       │ Priority     │ 20%          │');
    console.log('│ Diamond   │ 120 days │ 0 days       │ Instant      │ 30%          │');
    console.log('└───────────┴──────────┴──────────────┴──────────────┴──────────────┘');
    
    console.log('\n🎯 Professional Features Enabled:');
    console.log('✅ Dynamic cookie life per tier');
    console.log('✅ Tier-based payout priority');
    console.log('✅ Commission holding periods');
    console.log('✅ Enhanced benefits display');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Test cookie expiration with different tiers');
    console.log('2. Verify holding periods in commission flow');
    console.log('3. Update frontend to display new benefits');
    console.log('4. Test payout priority for Gold/Diamond tiers');
    
  } catch (error) {
    console.error('❌ Error updating tiers:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
updateTiers();
