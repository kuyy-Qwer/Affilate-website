# Security Specification for DigiAffiliate Store

## Data Invariants
1.  **Users**: A user can only edit their own profile. Roles (`admin`, `affiliate`) are immutable by the user themselves once set (requires admin verification).
2.  **Products**: Only users with the `admin` role can create, update, or delete products. Any user can read the product catalog.
3.  **Sales**: Sales can only be created by the system/payment trigger (or a customer upon successful purchase). Customers can only read their own purchases. Affiliates can read sales attributed to them.
4.  **Commission**: Commissions are calculated server-side or validated rigorously.

## The Dirty Dozen Payloads
1.  **Identity Spoofing**: Attempting to create a user profile with `role: "admin"` as a standard registration.
2.  **State Shortcutting**: Updating a `Sale` document to mark it as "paid" without a valid transaction ID.
3.  **Product Poisoning**: A non-admin user attempting to update a product price to `0`.
4.  **Data Scraping**: Attempting to list all `users` in the system.
5.  **PII Leak**: Attempting to read another user's private email/info.
6.  **Referral Hijack**: Attempting to update a `Sale` doc to change the `affiliateId`.
7.  **Unverified Write**: An unverified email user attempting to list a product.
8.  **Empty Schema**: Creating a product with no name or price.
9.  **ID Injection**: Using a 1MB string as a product ID.
10. **Admin Escalation**: An existing affiliate trying to update their own role to `admin`.
11. **Negative Commission**: Setting a `commission` field to a negative number.
12. **Future Sale**: Setting a `createdAt` timestamp to a future date.

## Test Runner (Conceptual)
Tests will ensure:
- `get(/users/attacker)` -> ALLOW if self, DENY if other.
- `create(/products/id)` -> DENY if not admin.
- `update(/products/id)` -> DENY if not admin.
- `list(/products)` -> ALLOW for all.
- `create(/sales/id)` -> ALLOW if authenticated.
- `list(/sales)` -> ALLOW only if `affiliateId == auth.uid` or `buyerId == auth.uid`.
