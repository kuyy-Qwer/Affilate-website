# Dynamic Tier System - Testing Guide

## Quick Start

### 1. Start the Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 2. Verify Tiers in Firestore

Open Firebase Console and check the `tiers` collection:
- Should have 5 documents: starter, bronze, silver, gold, diamond
- Each should have all required fields (commissionRate, minSales, maxSales, etc.)

### 3. Test Tier Display

#### As Affiliate User:
1. Login to your affiliate account
2. Navigate to Dashboard
3. Check sidebar - should show your current tier badge with:
   - Tier icon (emoji)
   - Tier name
   - Commission rate percentage
4. Check main dashboard - should show tier card with:
   - Tier color gradient background
   - Current tier name and icon
   - Current commission rate
   - Next tier target (if not at max tier)

## Test Scenarios

### Scenario 1: New User Registration
**Expected**: User should be assigned 'starter' tier (5% commission)

1. Register a new account
2. Check Firestore `users/{userId}` document
3. Verify `tier: "starter"` field exists
4. Login and check dashboard shows "Starter" tier

### Scenario 2: Commission Calculation
**Expected**: Commission should be calculated based on user's tier

**Test with Starter Tier (5%)**:
1. Login as new user (starter tier)
2. Purchase a product worth Rp 100,000
3. Expected commission: Rp 5,000 (5%)

**Test with Bronze Tier (10%)**:
1. Manually update user's tier to 'bronze' in Firestore
2. Purchase a product worth Rp 100,000
3. Expected commission: Rp 10,000 (10%)

### Scenario 3: Auto-Upgrade on Sale
**Expected**: User tier should automatically upgrade when reaching sales threshold

**Test Bronze → Silver Upgrade**:
1. Create user with 49 total sales and 'bronze' tier
2. Complete 1 more sale (total = 50)
3. Check Firestore - tier should update to 'silver'
4. Refresh dashboard - should show Silver tier (15%)

**Test Silver → Gold Upgrade**:
1. Create user with 99 total sales and 'silver' tier
2. Complete 1 more sale (total = 100)
3. Check Firestore - tier should update to 'gold'
4. Refresh dashboard - should show Gold tier (20%)

### Scenario 4: Product-Specific Commission Override
**Expected**: Product override should take precedence over tier rate

1. Create a product with commission override:
```json
{
  "commissionOverride": {
    "enabled": true,
    "rate": 0.25
  }
}
```
2. Purchase this product as Bronze user (normally 10%)
3. Expected commission: 25% (override rate)

### Scenario 5: Promotion Bonus
**Expected**: Bonus should be added during promotion period

1. Create a product with promotion bonus:
```json
{
  "promotionBonus": {
    "enabled": true,
    "bonusRate": 0.05,
    "startDate": "2026-04-29",
    "endDate": "2026-05-31",
    "description": "Launch Promo"
  }
}
```
2. Purchase during promotion period
3. Expected: Base commission + 5% bonus

### Scenario 6: Tier Display in Dashboard
**Expected**: Dashboard should show dynamic tier information

1. Login as affiliate
2. Check sidebar:
   - Tier badge color matches tier color from Firestore
   - Commission percentage is correct
3. Check main dashboard:
   - Tier card background color matches tier color
   - Tier icon displays correctly
   - Next tier target shows correct sales number

## Manual Testing Checklist

### Frontend Tests
- [ ] Tier badge displays in sidebar
- [ ] Tier color is correct
- [ ] Tier icon (emoji) displays
- [ ] Commission rate shows correct percentage
- [ ] Tier card in dashboard has correct gradient
- [ ] Next tier target displays correctly
- [ ] Dark mode works with tier colors

### Backend Tests
- [ ] GET /api/tiers returns all active tiers
- [ ] Commission calculation uses tier from Firestore
- [ ] Auto-upgrade updates user tier on sale
- [ ] Product override works correctly
- [ ] Promotion bonus calculates correctly
- [ ] Webhook processes sales correctly

### Database Tests
- [ ] Tiers collection exists with 5 documents
- [ ] Each tier has all required fields
- [ ] User documents have tier field
- [ ] Tier field updates on sale completion

## Debugging Tips

### Issue: Tier not displaying
**Check**:
1. Browser console for errors
2. Network tab - is `/api/tiers` being called?
3. Redux DevTools - is `tiers` array populated?
4. Firestore - do tier documents exist?

**Solution**:
```typescript
// Add console.log in useStore.ts
fetchTiers: async () => {
  console.log('[fetchTiers] Starting...');
  const tiers = await getTiers();
  console.log('[fetchTiers] Fetched:', tiers);
  set({ tiers });
}
```

### Issue: Commission still using old rates
**Check**:
1. Server logs - is tier being fetched from Firestore?
2. Firestore - does tier document exist?
3. User document - is tier field correct?

**Solution**:
```typescript
// Add console.log in server.ts
const tierSnap = await fs.collection('tiers').doc(userTierName).get();
console.log('[Commission] Tier:', userTierName, tierSnap.data());
```

### Issue: Auto-upgrade not working
**Check**:
1. Webhook logs - is sale being processed?
2. User document - is totalSales incrementing?
3. Tier logic - are tiers being fetched?

**Solution**:
```typescript
// Add console.log in webhook handler
console.log('[Webhook] User sales:', newTotalSales);
console.log('[Webhook] New tier:', newTier);
```

## API Testing with cURL

### Get All Active Tiers
```bash
curl http://localhost:3000/api/tiers
```

Expected response:
```json
[
  {
    "id": "starter",
    "name": "starter",
    "displayName": "Starter",
    "commissionRate": 0.05,
    "minSales": 0,
    "maxSales": 9,
    "color": "#9CA3AF",
    "icon": "🌱",
    "benefits": ["Dashboard Dasar", "5% Komisi", ...],
    "isActive": true,
    "order": 1
  },
  ...
]
```

### Get All Tiers (Admin)
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     http://localhost:3000/api/admin/tiers
```

### Create/Update Tier (Admin)
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "platinum",
       "displayName": "Platinum",
       "commissionRate": 0.35,
       "minSales": 500,
       "maxSales": null,
       "color": "#E5E4E2",
       "icon": "💍",
       "benefits": ["All Diamond benefits", "35% Commission"],
       "isActive": true,
       "order": 6
     }' \
     http://localhost:3000/api/admin/tiers/platinum
```

## Performance Testing

### Load Test: Tier Fetching
```bash
# Install Apache Bench
# Test tier endpoint
ab -n 1000 -c 10 http://localhost:3000/api/tiers
```

Expected:
- Response time < 100ms
- No errors
- Consistent response

### Load Test: Commission Calculation
Simulate 100 concurrent purchases and verify:
- All commissions calculated correctly
- All tier upgrades processed
- No race conditions

## Integration Testing

### Test Flow: Complete User Journey
1. **Register** → User created with 'starter' tier
2. **Make 10 sales** → Auto-upgrade to 'bronze'
3. **Make 40 more sales** (total 50) → Auto-upgrade to 'silver'
4. **Make 50 more sales** (total 100) → Auto-upgrade to 'gold'
5. **Make 150 more sales** (total 250) → Auto-upgrade to 'diamond'

Verify at each step:
- Tier field updated in Firestore
- Dashboard displays correct tier
- Commission rate is correct
- Next tier target updates

## Automated Testing (Future)

### Unit Tests
```typescript
// Example: Test tier calculation
describe('getTierForSales', () => {
  it('should return starter for 0-9 sales', () => {
    expect(getTierForSales(5)).toBe('starter');
  });
  
  it('should return bronze for 10-49 sales', () => {
    expect(getTierForSales(25)).toBe('bronze');
  });
  
  // ... more tests
});
```

### Integration Tests
```typescript
// Example: Test auto-upgrade
describe('Sale Webhook', () => {
  it('should upgrade user tier on qualifying sale', async () => {
    const user = await createTestUser({ totalSales: 49, tier: 'bronze' });
    await simulateSale(user.id);
    const updated = await getUser(user.id);
    expect(updated.tier).toBe('silver');
  });
});
```

## Rollback Plan

If issues occur in production:

### Quick Rollback
1. Revert server.ts to previous version
2. Redeploy
3. System will use old hardcoded logic

### Data Rollback
1. Backup current Firestore data
2. Restore previous tier values
3. Run migration script to fix user tiers

### Gradual Rollout
1. Enable dynamic tiers for 10% of users
2. Monitor for issues
3. Gradually increase to 100%

## Success Criteria

✅ All tiers display correctly in UI
✅ Commission calculation uses dynamic rates
✅ Auto-upgrade works on sale completion
✅ No performance degradation
✅ No errors in logs
✅ User experience is smooth

## Reporting Issues

When reporting issues, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Screenshots/videos
4. Browser console logs
5. Server logs
6. Firestore data snapshot

---

**Happy Testing!** 🚀

For questions, refer to:
- `DYNAMIC_TIER_SYSTEM.md` - Implementation details
- `IMPLEMENTATION_SUMMARY.md` - What was changed
- `DOKUMENTASI_LENGKAP.md` - Full system docs
