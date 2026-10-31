# Safwa Publishers — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every user profile (`/users/{userId}`) must have `uid == userId == request.auth.uid`. Non-admins cannot self-assign `isVerified: true` or `role: 'admin'`.
2. **PII Isolation**: No email addresses, phone numbers, or physical addresses are stored in `/users/{userId}` or any public collection.
3. **Editorial Workflow Gate**: A new literary post (`/posts/{postId}`) created by a non-admin author must start with `status == 'pending'`. Only the Chief Editor (`mohammedmusthafac3@gmail.com` with `email_verified == true` or a document in `/admins/{uid}`) can transition `status` to `'published'` or `'rejected'`.
4. **Relational Existence**: Comments (`/posts/{postId}/comments/{commentId}`) and Stories (`/stories/{storyId}`) can only be created when the referenced `/posts/{postId}` exists.
5. **Query Enforcer**: Every `allow list` rule evaluates `resource.data` directly without calling `get()` or `exists()`.

## 2. The "Dirty Dozen" Payloads (All Must Return PERMISSION_DENIED)
1. **Shadow Field Injection on User Create**: `{ uid: "u1", name: "Ali", username: "ali", bio: "", photoUrl: "", isVerified: false, role: "author", visibility: "public", followersCount: 0, followingCount: 0, isSuperAdmin: true }`
2. **Self-Verification Escalation on User Create**: `{ uid: "u1", name: "Ali", username: "ali", bio: "", photoUrl: "", isVerified: true, role: "admin", visibility: "public", followersCount: 0, followingCount: 0 }`
3. **Identity Spoofing on Post Create**: Authenticated as `u1`, creating a post with `authorId: "u2"`.
4. **Status Shortcutting on Post Create**: Non-admin `u1` creating a post directly with `status: "published"`.
5. **Unverified Email Admin Spoof**: Token has `email: "mohammedmusthafac3@gmail.com"` but `email_verified: false` attempting to approve a pending post.
6. **Value Poisoning on Post Update**: Updating `viewsCount` with a string `"1000"` instead of an integer.
7. **Orphaned Comment Creation**: Creating `/posts/non_existent_post/comments/c1` where parent post does not exist.
8. **ID Poisoning**: Creating a document with a 300-character ID or invalid characters (`post$123!`).
9. **Unauthorized Direct Message Read**: User `u3` attempting to read a message between `senderId: "u1"` and `receiverId: "u2"`.
10. **Immutable Field Mutation**: Updating `authorId` or `createdAt` on an existing `/posts/{postId}` document.
11. **Oversized String Denial-of-Wallet**: Submitting a comment with `text.size() > 2000`.
12. **Unrestricted List Scraping on Messages**: Running an unconstrained `list` query on `/messages` without filtering by `senderId == request.auth.uid` or `receiverId == request.auth.uid`.
