# Firebase Security Specification - PEPETASK

## 1. Data Invariants
- A user can only access their own profile.
- Balance and earnings can only be incremented, never decremented by the user (except potentially by a system admin, though no admin feature is yet implemented).
- `adsWatchedToday` cannot exceed 15 per day.
- Timestamps must be server-generated.
- String fields must not exceed reasonable lengths (prevent resource poisoning).

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1.  **Identity Theft**: Trying to update another user's balance.
2.  **Shadow Update**: Adding a field like `isAdmin: true` to a profile.
3.  **Balance Injection**: Trying to set `balance` to 1,000,000 directly instead of incrementing.
4.  **Reward Bypass**: Incrementing `balance` without incrementing `adsWatchedToday`.
5.  **Limit Violation**: Incrementing `adsWatchedToday` beyond 15.
6.  **Time Spoofing**: Providing a client-side `lastLogin` timestamp.
7.  **ID Poisoning**: Using a 2KB string as a `userId`.
8.  **Type Injection**: Sending `balance: "one million"`.
9.  **Immortality Check**: Trying to change `createdAt`.
10. **Refer Spoofing**: Manually incrementing `referCount`.
11. **Level Jump**: Manually setting `level: 100`.
12. **Blanket Read**: Attempting to list all users.

## 3. Security Rules Implementation Strategy
- Use `hasOnly()` on affected keys for updates.
- Centralized `isValidUser()` helper.
- Relational sync (though currently only `users` exists).
- Strict size limits on all strings.
