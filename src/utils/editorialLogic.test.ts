import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeManuscriptHeuristics,
  calculateAdminOverviewStats,
  calculateAuthorStats,
  canUserAccessManuscript,
  filterPublishedPosts,
  formatSubmissionStatusLabel,
  incrementPostViewCount,
  isAdminRole,
  normalizeRole,
  sanitizePostPayload,
  sanitizeUserProfilePayload,
  type LiteraryPost,
  type UserProfile
} from './editorialLogic';
import {
  createSignedSessionToken,
  hashPasswordWithSalt,
  verifyPasswordHash,
  verifySignedSessionToken
} from '../server/authAndDb';

const samplePost: LiteraryPost = {
  id: 'post_1',
  authorId: 'author_1',
  authorName: 'Mahmoud Al-Masri',
  authorUsername: 'mahmoud_lit',
  authorPhoto: '',
  authorVerified: true,
  language: 'ar',
  section: 'poetry',
  title: 'قصيدة البحر والذاكرة',
  subtitle: 'تأملات في الموج المسائي',
  content: 'على شاطئ الصمت تكتب الريح أسماء الغائبين فوق صفحة الماء.',
  coverUrl: '',
  aiScore: 12,
  aiVerdict: 'High human literary authenticity',
  status: 'published',
  viewsCount: 0,
  likesCount: 4,
  commentsCount: 2,
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z'
};

test('incrementPostViewCount increments 0 -> 1 on first read and 1 -> 2 on second read', () => {
  const afterFirstRead = incrementPostViewCount(samplePost);
  assert.equal(afterFirstRead.viewsCount, 1);

  const afterSecondRead = incrementPostViewCount(afterFirstRead);
  assert.equal(afterSecondRead.viewsCount, 2);
});

test('filterPublishedPosts filters accurately by language, section, and published status', () => {
  const posts: LiteraryPost[] = [
    samplePost,
    {
      ...samplePost,
      id: 'post_2',
      language: 'ml',
      section: 'fiction',
      title: 'മഴക്കാലത്തെ കത്തുകൾ',
      status: 'published'
    },
    {
      ...samplePost,
      id: 'post_3',
      language: 'en',
      section: 'non-fiction',
      title: 'Pending Essay',
      status: 'pending'
    }
  ];

  const arabicOnly = filterPublishedPosts(posts, { language: 'ar', section: 'all' });
  assert.equal(arabicOnly.length, 1);
  assert.equal(arabicOnly[0].id, 'post_1');

  const malayalamFiction = filterPublishedPosts(posts, { language: 'ml', section: 'fiction' });
  assert.equal(malayalamFiction.length, 1);
  assert.equal(malayalamFiction[0].id, 'post_2');

  const allPublished = filterPublishedPosts(posts, { language: 'all', section: 'all' });
  assert.equal(allPublished.length, 2);
});

test('analyzeManuscriptHeuristics flags formulaic AI phrases with higher AI percentage', () => {
  const humanPoem = analyzeManuscriptHeuristics(
    'Rain drummed softly on the laterite steps. Kunjunni folded the wet newspaper, listening for the ferry horn across the river.'
  );
  const syntheticEssay = analyzeManuscriptHeuristics(
    'In conclusion, it is important to note that we must delve into the rich tapestry of literature. Moreover, this symphony of words serves as a testament to unwavering creativity in the realm of art.'
  );

  assert.ok(humanPoem.aiScore < 30, `Expected human poem score < 30, got ${humanPoem.aiScore}`);
  assert.ok(syntheticEssay.aiScore >= 60, `Expected synthetic essay score >= 60, got ${syntheticEssay.aiScore}`);
});

test('sanitizePostPayload and sanitizeUserProfilePayload enforce blueprint bounds', () => {
  const sanitizedPost = sanitizePostPayload({
    ...samplePost,
    aiScore: 145,
    viewsCount: -5
  });
  assert.equal(sanitizedPost.aiScore, 100);
  assert.equal(sanitizedPost.viewsCount, 0);

  const sanitizedUser = sanitizeUserProfilePayload({
    uid: 'user_abc',
    name: 'Nadia Cherian',
    username: 'a',
    bio: 'Malayalam & English Essayist',
    photoUrl: '',
    isVerified: false,
    role: 'USER',
    visibility: 'public',
    followersCount: -2,
    followingCount: 3,
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T10:00:00.000Z'
  });
  assert.ok(sanitizedUser.username.length >= 2);
  assert.equal(sanitizedUser.followersCount, 0);
});

test('calculateAuthorStats returns 0 reads, 0 likes, 0 followers when web is emptied / starting', () => {
  const emptyStats = calculateAuthorStats([], 'author_1', 0);
  assert.deepEqual(emptyStats, {
    totalReads: 0,
    totalLikes: 0,
    totalFollowers: 0,
    publishedWorksCount: 0
  });
});

test('calculateAuthorStats accurately calculates total reads, likes, and followers for published works only', () => {
  const authorWorks: LiteraryPost[] = [
    {
      ...samplePost,
      id: 'p1',
      authorId: 'author_1',
      status: 'published',
      viewsCount: 15,
      likesCount: 8
    },
    {
      ...samplePost,
      id: 'p2',
      authorId: 'author_1',
      status: 'published',
      viewsCount: 25,
      likesCount: 12
    },
    {
      ...samplePost,
      id: 'p3',
      authorId: 'author_1',
      status: 'pending', // Not published yet - should not count
      viewsCount: 100,
      likesCount: 50
    },
    {
      ...samplePost,
      id: 'p4',
      authorId: 'other_author', // Different author
      status: 'published',
      viewsCount: 80,
      likesCount: 40
    }
  ];

  const stats = calculateAuthorStats(authorWorks, 'author_1', 42);
  assert.equal(stats.totalReads, 40); // 15 + 25
  assert.equal(stats.totalLikes, 20); // 8 + 12
  assert.equal(stats.totalFollowers, 42);
  assert.equal(stats.publishedWorksCount, 2);
});

test('RBAC helpers enforce strict USER vs ADMIN normalization and private manuscript protection', () => {
  assert.equal(isAdminRole('ADMIN'), true);
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('USER'), false);
  assert.equal(isAdminRole('author'), false);
  assert.equal(normalizeRole('ADMIN'), 'ADMIN');
  assert.equal(normalizeRole('USER'), 'USER');

  const draftPost: LiteraryPost = {
    ...samplePost,
    id: 'draft_1',
    authorId: 'author_1',
    status: 'draft'
  };

  // Anonymous visitor cannot read draft
  assert.equal(canUserAccessManuscript(draftPost, null), false);
  // Another non-admin user cannot read author_1's private draft
  assert.equal(canUserAccessManuscript(draftPost, { uid: 'author_2', role: 'USER' }), false);
  // The owning author can read their own draft
  assert.equal(canUserAccessManuscript(draftPost, { uid: 'author_1', role: 'USER' }), true);
  // An administrator can review manuscripts
  assert.equal(canUserAccessManuscript(draftPost, { uid: 'admin_1', role: 'ADMIN' }), true);
  // Anyone can read a published post
  assert.equal(canUserAccessManuscript(samplePost, null), true);
  assert.equal(formatSubmissionStatusLabel('under_review'), 'Under Review');
  assert.equal(formatSubmissionStatusLabel('revision_requested'), 'Revision Requested');
});

test('calculateAdminOverviewStats aggregates user, status, and language metrics accurately', () => {
  const users: UserProfile[] = [
    {
      uid: 'u1',
      name: 'Admin User',
      username: 'admin',
      bio: 'Admin',
      photoUrl: '',
      isVerified: true,
      role: 'ADMIN',
      accountStatus: 'active',
      visibility: 'public',
      followersCount: 10,
      followingCount: 1,
      createdAt: '2026-10-30T10:00:00.000Z',
      updatedAt: '2026-10-30T10:00:00.000Z'
    },
    {
      uid: 'u2',
      name: 'Suspended Author',
      username: 'suspended_u',
      bio: 'Author',
      photoUrl: '',
      isVerified: false,
      role: 'USER',
      accountStatus: 'suspended',
      visibility: 'public',
      followersCount: 0,
      followingCount: 0,
      createdAt: '2026-10-30T10:00:00.000Z',
      updatedAt: '2026-10-30T10:00:00.000Z'
    }
  ];

  const manuscripts: LiteraryPost[] = [
    { ...samplePost, id: 'm1', status: 'published', language: 'ar' },
    { ...samplePost, id: 'm2', status: 'pending', language: 'ml' },
    { ...samplePost, id: 'm3', status: 'under_review', language: 'en' },
    { ...samplePost, id: 'm4', status: 'accepted', language: 'ar' },
    { ...samplePost, id: 'm5', status: 'rejected', language: 'en' },
    { ...samplePost, id: 'm6', status: 'draft', language: 'ml' }
  ];

  const overview = calculateAdminOverviewStats(users, manuscripts);
  assert.equal(overview.totalUsers, 2);
  assert.equal(overview.activeUsers, 1);
  assert.equal(overview.suspendedUsers, 1);
  assert.equal(overview.totalSubmissions, 5); // Excludes private unsubmitted drafts
  assert.equal(overview.publishedCount, 1);
  assert.equal(overview.pendingCount, 1);
  assert.equal(overview.underReviewCount, 1);
  assert.equal(overview.acceptedCount, 1);
  assert.equal(overview.rejectedCount, 1);
  assert.equal(overview.draftCount, 1);
});

test('scrypt password hashing and HMAC session tokens verify securely and reject tampering', () => {
  const { hash, salt } = hashPasswordWithSalt('MyStrongPassword!2026');
  assert.equal(verifyPasswordHash('MyStrongPassword!2026', salt, hash), true);
  assert.equal(verifyPasswordHash('WrongPassword!2026', salt, hash), false);

  const { token } = createSignedSessionToken({
    uid: 'user_123',
    role: 'USER',
    email: 'author@example.com'
  });
  const verified = verifySignedSessionToken(token);
  assert.ok(verified);
  assert.equal(verified.uid, 'user_123');
  assert.equal(verified.role, 'USER');

  // Tamper with payload to attempt privilege escalation to ADMIN
  const [, sig] = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ uid: 'user_123', role: 'ADMIN', email: 'author@example.com', sid: 'fake', iat: 1000, exp: Math.floor(Date.now() / 1000) + 60000 })
  ).toString('base64url');
  const tamperedToken = `${tamperedPayload}.${sig}`;
  assert.equal(verifySignedSessionToken(tamperedToken), null);
});


