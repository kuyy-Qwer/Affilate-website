# Dynamic Tier System - Implementation Guide

## Overview
The Dynamic Tier System replaces the hardcoded commission logic with a flexible, database-driven tier management system. This allows administrators to create, modify, and manage affiliate tiers without code changes.

## What Changed

### Before (Hardcoded)
```typescript
// Old logic in server.ts
const salesCount = affData.totalSales || 0;
let rate = 0.1; // Bronze (Default)
if (salesCount >= 50) rate = 0.25; // Diamond
else if (salesCount >= 10) rate = 0.15; // Gold
```

### After (Dynamic)
```typescript
// New logic in server.ts
const userTierName = affData.tier || 'starter';
const tierSnap = await fs.collection('tiers').doc(userTierName).get();
if (tierSnap.exists) {
  const tierData = tierSnap.data();
  rate = tierData?.commissionRate || 0.05;
}
```

## Features Implemented

### 1. **Tier Collection in Firestore**
- Location: `tiers` collection
- Each tier document contains:
  - `id`: Unique identifier (e.g., 'starter', 'bronze', 'silver', 'gold', 'diamond')
  - `name`: Internal name
  - `displayName`: User-facing name
  - `commissionRate`: Decimal rate (e.g., 0.05 for 5%)
  - `minSales`: Minimum sales to qualify
  - `maxSales`: Maximum sales (null = unlimited)
  - `color`: Hex color for UI display
  - `icon`: Emoji icon
  - `benefits`: Array of benefit descriptions
  - `isActive`: Boolean to enable/disable
  - `order`: Sort order
  - `createdAt`: Timestamp

### 2. **Default Tiers**
| Tier | Icon | Commission | Sales Range | Color |
|------|------|------------|-------------|-------|
| Starter | 🌱 | 5% | 0-9 | #9CA3AF |
| Bronze | 🥉 | 10% | 10-49 | #CD7F32 |
| Silver | 🥈 | 15% | 50-99 | #C0C0C0 |
| Gold | 🥇 | 20% | 100-249 | #FFD700 |
| Diamond | 💎 | 30% | 250+ | #B9F2FF |

### 3. **Auto-Upgrade Logic**
When a sale is completed, the system automatically:
1. Fetches all active tiers sorted by order (descending)
2. Finds the highest tier the user qualifies for based on `totalSales`
3. Updates the user's tier if they've reached a new level

### 4. **Product-Specific Commission Override**
Products can now have custom commission rates:
```typescript
{
  commissionOverride: {
    enabled: true,
    rate: 0.25, // 25% for all tiers
    tierSpecific: {
      'diamond': 0.35, // 35% for diamond tier only
      'gold': 0.30     // 30% for gold tier
    }
  }
}
```

### 5. **Promotion Bonus**
Products can have time-limited bonus commissions:
```typescript
{
  promotionBonus: {
    enabled: true,
    bonusRate: 0.05, // Additional 5%
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    description: 'Launch Promo'
  }
}
```

## API Endpoints

### Public Endpoints
- `GET /api/tiers` - Get all active tiers (for display)

### Admin Endpoints
- `GET /api/admin/tiers` - Get all tiers (including inactive)
- `POST /api/admin/tiers/:id` - Create or update a tier
- `DELETE /api/admin/tiers/:id` - Delete a tier

## Frontend Integration

### Store (Zustand)
```typescript
// src/store/useStore.ts
const { tiers, fetchTiers } = useStore();

// Fetch tiers on app init
useEffect(() => {
  fetchTiers();
}, []);
```

### Dashboard Display
```typescript
// Get user's current tier
const userTierName = user.tier || 'starter';
const currentTier = tiers.find(t => t.id === userTierName);

// Display tier info
<div style={{ backgroundColor: currentTier?.color }}>
  {currentTier?.icon} {currentTier?.displayName}
  <span>{(currentTier?.commissionRate * 100).toFixed(0)}%</span>
</div>
```

## Migration Guide

### For Existing Users
Run this script to migrate existing users from old tier names to new ones:

```typescript
// scripts/migrateTiers.ts
const oldToNew = {
  'bronze': 'bronze',  // No change
  'gold': 'gold',      // No change
  'diamond': 'diamond' // No change
};

// Users without tier get 'starter'
const usersSnap = await db.collection('users').get();
for (const doc of usersSnap.docs) {
  const data = doc.data();
  if (!data.tier) {
    await doc.ref.update({ tier: 'starter' });
  }
}
```

## Testing Checklist

- [x] Tiers initialized in Firestore
- [ ] Commission calculation uses dynamic tiers
- [ ] Auto-upgrade works on sale completion
- [ ] Tier display in dashboard shows correct data
- [ ] Product-specific commission override works
- [ ] Promotion bonus calculation works
- [ ] Admin UI for tier management (TODO)

## Next Steps

### Phase 2A: Admin UI for Tier Management
Create admin interface to:
- View all tiers
- Create new tiers
- Edit existing tiers
- Activate/deactivate tiers
- Reorder tiers

### Phase 2B: Analytics
- Track tier distribution (how many users in each tier)
- Show tier progression history
- Display average time to reach each tier

### Phase 2C: Tier Benefits
- Implement tier-specific features (not just commission)
- Custom branding for higher tiers
- Priority support access
- Exclusive marketing materials

## Troubleshooting

### Issue: Commission still using old rates
**Solution**: Check that tiers are properly initialized in Firestore. Run:
```bash
npx tsx scripts/initializeTiers.ts
```

### Issue: User tier not updating
**Solution**: Verify the auto-upgrade logic in the webhook handler. Check Firestore rules allow tier updates.

### Issue: Tier not displaying in dashboard
**Solution**: Ensure `fetchTiers()` is called on app initialization and tiers are loaded before rendering.

## Files Modified

1. **server.ts**
   - Updated commission calculation logic (line ~545-570)
   - Updated auto-upgrade logic in webhook (line ~320-340)
   - Added tier management API endpoints

2. **src/types.ts**
   - Added `Tier` interface
   - Updated `User.tier` to string type
   - Added `Product.commissionOverride` and `Product.promotionBonus`

3. **src/store/useStore.ts**
   - Added `tiers` state
   - Added `fetchTiers()` function

4. **src/App.tsx**
   - Updated `AffiliateDashboard` to use dynamic tier data
   - Added tier color and icon display

5. **src/components/DashboardLayout.tsx**
   - Updated sidebar tier badge to use dynamic data

6. **scripts/initializeTiers.ts**
   - Created initialization script for default tiers

## Benefits

✅ **Flexibility**: Change commission rates without code deployment
✅ **Scalability**: Add unlimited tiers as business grows
✅ **Experimentation**: A/B test different tier structures
✅ **Transparency**: Clear tier progression for affiliates
✅ **Automation**: Auto-upgrade reduces manual work
✅ **Customization**: Product-specific and time-limited bonuses

## Support

For questions or issues, check:
- `DOKUMENTASI_LENGKAP.md` - Full system documentation
- `TECHNICAL_GUIDE.md` - Technical implementation details
- GitHub Issues - Report bugs or request features
