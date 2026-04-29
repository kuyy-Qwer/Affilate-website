/**
 * Script to initialize default tier system in Firestore
 * Run with: npx tsx scripts/initializeTiers.ts
 */

import admin from 'firebase-admin';
import { Tier } from '../src/types.js';
import serviceAccount from '../serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  });
}

const db = admin.firestore();

const defaultTiers: Omit<Tier, 'createdAt'>[] = [
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    commissionRate: 0.05,
    minSales: 0,
    maxSales: 9,
    color: '#9CA3AF',
    icon: '🌱',
    benefits: [
      'Dashboard Dasar',
      '5% Komisi',
      '1 Link Referal',
      'Materi LMS Dasar'
    ],
    isActive: true,
    order: 1,
    cookieLifeDays: 30,
    payoutPriority: 'standard',
    payoutHoldingDays: 14
  },
  {
    id: 'bronze',
    name: 'bronze',
    displayName: 'Bronze',
    commissionRate: 0.10,
    minSales: 10,
    maxSales: 49,
    color: '#CD7F32',
    icon: '🥉',
    benefits: [
      'Dashboard Pro',
      '10% Komisi',
      'Unlimited Links',
      'Akses Full LMS',
      'Marketing Kit Dasar',
      'Cookie 45 hari'
    ],
    isActive: true,
    order: 2,
    cookieLifeDays: 45,
    payoutPriority: 'standard',
    payoutHoldingDays: 10
  },
  {
    id: 'silver',
    name: 'silver',
    displayName: 'Silver',
    commissionRate: 0.15,
    minSales: 50,
    maxSales: 99,
    color: '#C0C0C0',
    icon: '🥈',
    benefits: [
      'Semua fitur Bronze',
      '15% Komisi',
      'Marketing Kit Premium',
      'Email Support',
      'Badge Silver di Profil',
      'Cookie 60 hari',
      'Payout 7 hari'
    ],
    isActive: true,
    order: 3,
    cookieLifeDays: 60,
    payoutPriority: 'standard',
    payoutHoldingDays: 7
  },
  {
    id: 'gold',
    name: 'gold',
    displayName: 'Gold',
    commissionRate: 0.20,
    minSales: 100,
    maxSales: 249,
    color: '#FFD700',
    icon: '🥇',
    benefits: [
      'Semua fitur Silver',
      '20% Komisi',
      'Custom Branding',
      'Priority Support',
      'Webinar Eksklusif',
      'Badge Gold di Profil',
      'Cookie 90 hari',
      'Priority Payout (24 jam)'
    ],
    isActive: true,
    order: 4,
    cookieLifeDays: 90,
    payoutPriority: 'priority',
    payoutHoldingDays: 3
  },
  {
    id: 'diamond',
    name: 'diamond',
    displayName: 'Diamond',
    commissionRate: 0.30,
    minSales: 250,
    maxSales: null, // Unlimited
    color: '#B9F2FF',
    icon: '💎',
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
    ],
    isActive: true,
    order: 5,
    cookieLifeDays: 120,
    payoutPriority: 'instant',
    payoutHoldingDays: 0
  }
];

async function initializeTiers() {
  console.log('🚀 Initializing tier system...\n');
  
  try {
    const batch = db.batch();
    
    for (const tier of defaultTiers) {
      const tierRef = db.collection('tiers').doc(tier.id);
      
      // Check if tier already exists
      const tierDoc = await tierRef.get();
      
      if (tierDoc.exists) {
        console.log(`⏭️  Tier "${tier.displayName}" already exists, skipping...`);
        continue;
      }
      
      batch.set(tierRef, {
        ...tier,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ Queued tier: ${tier.displayName} (${tier.commissionRate * 100}% commission)`);
    }
    
    await batch.commit();
    console.log('\n✨ All tiers initialized successfully!');
    
    // Display summary
    console.log('\n📊 Tier Summary:');
    console.log('┌─────────────┬──────────┬─────────────┬─────────────┐');
    console.log('│ Tier        │ Icon     │ Commission  │ Sales Range │');
    console.log('├─────────────┼──────────┼─────────────┼─────────────┤');
    
    for (const tier of defaultTiers) {
      const maxSales = tier.maxSales === null ? '∞' : tier.maxSales.toString();
      console.log(
        `│ ${tier.displayName.padEnd(11)} │ ${tier.icon}       │ ${(tier.commissionRate * 100).toString().padEnd(11)}% │ ${tier.minSales.toString().padStart(3)}-${maxSales.padEnd(7)} │`
      );
    }
    
    console.log('└─────────────┴──────────┴─────────────┴─────────────┘');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Update existing users to use new tier system');
    console.log('2. Update server commission calculation logic');
    console.log('3. Create admin UI for tier management');
    console.log('4. Test tier auto-upgrade functionality');
    
  } catch (error) {
    console.error('❌ Error initializing tiers:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
initializeTiers();
