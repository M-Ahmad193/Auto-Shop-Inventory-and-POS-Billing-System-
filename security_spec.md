# Security Specification - Afzal Auto Service POS

## Data Invariants
1. Bills must be immutable once created (except for reprint logs or critical admin correction).
2. Users can only be created/modified by Admins.
3. Staff can only access Billing and certain search features.
4. Every write must have a server-side timestamp.
5. Item sale price cannot be lower than cost price (business logic, but useful in rules).

## The Dirty Dozen (Vulnerable Payloads)
1. **The Role Escalation**: Staff user trying to update their role to 'admin'.
2. **The Price Manipulation**: Staff creating a bill where an item price is $0.
3. **The Inventory Wipeout**: Anonymous user trying to delete all inventory.
4. **The Expense Padding**: Staff adding fake expenses.
5. **The Bill Injection**: Creating a bill for a user ID that doesn't exist.
6. **The Profit Hider**: Creating a bill where profit = $0 manually even if sale - cost > 0.
7. **The ID Poisoning**: Using a 2MB string as a document ID.
8. **The Timewarp**: Setting a bill's `createdAt` to 2010.
9. **The Customer Data Scraping**: Staff trying to read all customer phone numbers in a loop (list query without restriction).
10. **The Bulk Deletion**: Any user attempting an atomic batch delete of all service records.
11. **The Item Shadow Field**: Adding `isFree: true` to an inventory item.
12. **The Admin Impersonation**: Attempting to read `/users` as an unauthenticated user.

## Firestone Rules Checklist (Hardeners)
- [x] Catch-all deny
- [x] ID length limits
- [x] Staff vs Admin role checking
- [x] Data schema validation (types, sizes)
- [x] Server-side timestamps only
- [x] No `list` on sensitive PII without ownership or admin role
