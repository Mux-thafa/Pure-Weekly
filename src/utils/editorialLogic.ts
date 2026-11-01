export type LanguageCode = 'en' | 'ar' | 'ml';
export type LiterarySection = 'fiction' | 'poetry' | 'non-fiction';
export type PostStatus =
  | 'draft'
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'revision_requested'
  | 'rejected'
  | 'published';

export type AccountRole = 'USER' | 'ADMIN' | 'reader' | 'author' | 'admin';
export type AccountStatus = 'active' | 'suspended';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  email?: string;
  preferredLanguage?: LanguageCode;
  bio: string;
  photoUrl: string;
  isVerified: boolean;
  role: AccountRole;
  accountStatus?: AccountStatus;
  visibility: 'public';
  followersCount: number;
  followingCount: number;
  emailNotifications?: boolean;
  editorialAlerts?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRecord {
  userId: string;
  role: 'USER' | 'ADMIN';
  assignedBy: string;
  updatedAt: string;
}

export interface LiteraryPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  authorVerified: boolean;
  language: LanguageCode;
  section: LiterarySection;
  categoryId?: string;
  title: string;
  subtitle: string;
  content: string;
  coverUrl: string;
  aiScore: number;
  aiVerdict: string;
  status: PostStatus;
  editorialNotes?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationRecord {
  id: string;
  manuscriptId: string;
  authorId: string;
  authorName: string;
  language: LanguageCode;
  section: LiterarySection;
  title: string;
  publishedBy: string;
  publishedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  language: LanguageCode | 'all';
  section: LiterarySection;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  language: LanguageCode | 'all';
  isActive: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorVerified: boolean;
  text: string;
  visibility: 'public';
  createdAt: string;
}

export interface StoryItem {
  id: string;
  postId: string;
  postTitle: string;
  postSection: LiterarySection;
  postLanguage: LanguageCode;
  excerpt: string;
  coverUrl: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  authorVerified: boolean;
  durationSeconds: number;
  visibility: 'public';
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  text: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  targetUserId: string;
  actorId: string;
  actorName: string;
  type:
    | 'published'
    | 'submission'
    | 'verified'
    | 'new_account'
    | 'admin_notice'
    | 'status_update';
  title: string;
  message?: string;
  postId: string;
  isRead?: boolean;
  createdAt: string;
}

export interface AiCheckResult {
  aiScore: number;
  aiVerdict: string;
  signals: string[];
}

export interface AuthorStats {
  totalReads: number;
  totalLikes: number;
  totalFollowers: number;
  publishedWorksCount: number;
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSubmissions: number;
  draftCount: number;
  pendingCount: number;
  underReviewCount: number;
  acceptedCount: number;
  revisionRequestedCount: number;
  rejectedCount: number;
  publishedCount: number;
}

export const CHIEF_EDITOR_EMAIL = 'mohammedmusthafac3@gmail.com';
export const OFFICIAL_SAFWA_UID = 'safwa_official_account';

export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return role.toUpperCase() === 'ADMIN';
}

export function normalizeRole(role?: string | null): 'USER' | 'ADMIN' {
  return isAdminRole(role) ? 'ADMIN' : 'USER';
}

export function formatSubmissionStatusLabel(status: PostStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending':
      return 'Pending';
    case 'under_review':
      return 'Under Review';
    case 'accepted':
      return 'Accepted';
    case 'revision_requested':
      return 'Revision Requested';
    case 'rejected':
      return 'Rejected';
    case 'published':
      return 'Published';
    default:
      return 'Pending';
  }
}

export function canUserAccessManuscript(
  post: Pick<LiteraryPost, 'authorId' | 'status'>,
  viewer: { uid?: string | null; role?: string | null } | null
): boolean {
  if (post.status === 'published') return true;
  if (!viewer || !viewer.uid) return false;
  if (isAdminRole(viewer.role)) return true;
  return post.authorId === viewer.uid;
}

/**
 * Calculates author profile statistics across published works:
 * total reads (views), total likes, total followers, and published count.
 */
export function calculateAuthorStats(
  posts: LiteraryPost[],
  authorId: string,
  authorFollowers = 0
): AuthorStats {
  const publishedWorks = (posts || []).filter(
    (p) => p.authorId === authorId && p.status === 'published'
  );

  const totalReads = publishedWorks.reduce(
    (acc, p) => acc + Math.max(0, Number(p.viewsCount) || 0),
    0
  );

  const totalLikes = publishedWorks.reduce(
    (acc, p) => acc + Math.max(0, Number(p.likesCount) || 0),
    0
  );

  return {
    totalReads,
    totalLikes,
    totalFollowers: Math.max(0, Math.floor(Number(authorFollowers) || 0)),
    publishedWorksCount: publishedWorks.length
  };
}

/**
 * Calculates comprehensive admin overview statistics across users and manuscripts.
 */
export function calculateAdminOverviewStats(
  users: UserProfile[],
  posts: LiteraryPost[]
): AdminOverviewStats {
  const safeUsers = users || [];
  const safePosts = posts || [];
  const nonDraftSubmissions = safePosts.filter((p) => p.status !== 'draft');

  return {
    totalUsers: safeUsers.length,
    activeUsers: safeUsers.filter((u) => (u.accountStatus || 'active') === 'active').length,
    suspendedUsers: safeUsers.filter((u) => u.accountStatus === 'suspended').length,
    totalSubmissions: nonDraftSubmissions.length,
    draftCount: safePosts.filter((p) => p.status === 'draft').length,
    pendingCount: safePosts.filter((p) => p.status === 'pending').length,
    underReviewCount: safePosts.filter((p) => p.status === 'under_review').length,
    acceptedCount: safePosts.filter((p) => p.status === 'accepted').length,
    revisionRequestedCount: safePosts.filter((p) => p.status === 'revision_requested').length,
    rejectedCount: safePosts.filter((p) => p.status === 'rejected').length,
    publishedCount: safePosts.filter((p) => p.status === 'published').length
  };
}

/**
 * Deterministic linguistic burstiness & formulaic phrasing analyzer
 * used as fallback or pre-check alongside Gemini AI analysis.
 */
export function analyzeManuscriptHeuristics(text: string, title = ''): AiCheckResult {
  const clean = (text || '').trim();
  if (!clean) {
    return {
      aiScore: 0,
      aiVerdict: 'Awaiting manuscript text for analysis.',
      signals: []
    };
  }

  const aiMarkers = [
    'delve into',
    'testament to',
    'tapestry of',
    'in conclusion',
    'moreover',
    'furthermore',
    'it is important to note',
    'symphony of',
    'beacon of',
    'unwavering',
    'realm of'
  ];

  const lower = `${title} ${clean}`.toLowerCase();
  const matchedMarkers = aiMarkers.filter((m) => lower.includes(m));

  const sentences = clean
    .split(/[.!?؟।]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let lengthVarianceRatio = 0.5;
  if (sentences.length >= 3) {
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    lengthVarianceRatio = mean > 0 ? stdDev / mean : 0.5;
  }

  let score = 14;
  score += matchedMarkers.length * 16;
  if (lengthVarianceRatio < 0.25 && sentences.length >= 3) {
    score += 24;
  } else if (lengthVarianceRatio > 0.55) {
    score -= 6;
  }

  const clampedScore = Math.max(4, Math.min(96, Math.round(score)));
  const signals: string[] = [];

  if (matchedMarkers.length > 0) {
    signals.push(`Detected formulaic transitions (${matchedMarkers.slice(0, 3).join(', ')})`);
  } else {
    signals.push('Natural lexical variety across clauses');
  }

  if (lengthVarianceRatio < 0.25 && sentences.length >= 3) {
    signals.push('Uniform sentence cadence typical of synthetic generation');
  } else {
    signals.push('High sentence-length burstiness consistent with human authorship');
  }

  let aiVerdict = 'High human literary authenticity — recommended for editorial acceptance.';
  if (clampedScore >= 65) {
    aiVerdict = 'Elevated synthetic phrasing detected — requires close Chief Editor review.';
  } else if (clampedScore >= 35) {
    aiVerdict = 'Mixed stylistic cadence — predominantly human with polished transitions.';
  }

  return {
    aiScore: clampedScore,
    aiVerdict,
    signals
  };
}

/**
 * Filter published posts by language and section.
 */
export function filterPublishedPosts(
  posts: LiteraryPost[],
  options: {
    language?: LanguageCode | 'all';
    section?: LiterarySection | 'all';
    searchQuery?: string;
  }
): LiteraryPost[] {
  const { language = 'all', section = 'all', searchQuery = '' } = options;
  const q = searchQuery.trim().toLowerCase();

  return posts.filter((post) => {
    if (post.status !== 'published') return false;
    if (language !== 'all' && post.language !== language) return false;
    if (section !== 'all' && post.section !== section) return false;
    if (q) {
      const hay = `${post.title} ${post.subtitle} ${post.authorName} ${post.content}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Increments a post's view count by 1 every time a reader opens the full post.
 * Opening once -> +1, opening again -> +2.
 */
export function incrementPostViewCount(post: LiteraryPost): LiteraryPost {
  return {
    ...post,
    viewsCount: Math.max(0, Math.floor(post.viewsCount || 0)) + 1,
    updatedAt: new Date().toISOString()
  };
}

const VALID_STATUSES: PostStatus[] = [
  'draft',
  'pending',
  'under_review',
  'accepted',
  'revision_requested',
  'rejected',
  'published'
];

/**
 * Sanitizes and truncates post payload to strictly match firebase-blueprint.json & firestore.rules.
 */
export function sanitizePostPayload(
  raw: Omit<LiteraryPost, 'id'>
): Omit<LiteraryPost, 'id'> {
  const cleanId = (val: string) => val.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128) || 'user_1';
  const now = new Date().toISOString();
  const status: PostStatus = VALID_STATUSES.includes(raw.status) ? raw.status : 'pending';

  return {
    authorId: cleanId(raw.authorId),
    authorName: (raw.authorName || 'Anonymous Author').trim().slice(0, 100),
    authorUsername: (raw.authorUsername || 'author').trim().slice(0, 50),
    authorPhoto: (raw.authorPhoto || '').slice(0, 200000),
    authorVerified: Boolean(raw.authorVerified),
    language: ['en', 'ar', 'ml'].includes(raw.language) ? raw.language : 'en',
    section: ['fiction', 'poetry', 'non-fiction'].includes(raw.section) ? raw.section : 'fiction',
    ...(raw.categoryId ? { categoryId: cleanId(raw.categoryId) } : {}),
    title: (raw.title || 'Untitled').trim().slice(0, 200),
    subtitle: (raw.subtitle || '').trim().slice(0, 300),
    content: (raw.content || '').trim().slice(0, 50000),
    coverUrl: (raw.coverUrl || '').slice(0, 300000),
    aiScore: Math.max(0, Math.min(100, Math.round(Number(raw.aiScore) || 0))),
    aiVerdict: (raw.aiVerdict || 'Analyzed by Safwa Editorial AI Guard').slice(0, 500),
    status,
    ...(typeof raw.editorialNotes === 'string'
      ? { editorialNotes: raw.editorialNotes.trim().slice(0, 1000) }
      : {}),
    viewsCount: Math.max(0, Math.floor(Number(raw.viewsCount) || 0)),
    likesCount: Math.max(0, Math.floor(Number(raw.likesCount) || 0)),
    commentsCount: Math.max(0, Math.floor(Number(raw.commentsCount) || 0)),
    ...(raw.publishedAt ? { publishedAt: raw.publishedAt.slice(0, 64) } : {}),
    createdAt: (raw.createdAt || now).slice(0, 64),
    updatedAt: (raw.updatedAt || now).slice(0, 64)
  };
}

/**
 * Strict Firestore-compatible post payload containing only the 19 core blueprint keys
 * required by firestore.rules.
 */
export function toFirestorePostDoc(raw: Omit<LiteraryPost, 'id'>) {
  const sanitized = sanitizePostPayload(raw);
  return {
    authorId: sanitized.authorId,
    authorName: sanitized.authorName,
    authorUsername: sanitized.authorUsername,
    authorPhoto: sanitized.authorPhoto,
    authorVerified: sanitized.authorVerified,
    language: sanitized.language,
    section: sanitized.section,
    title: sanitized.title,
    subtitle: sanitized.subtitle,
    content: sanitized.content,
    coverUrl: sanitized.coverUrl,
    aiScore: sanitized.aiScore,
    aiVerdict: sanitized.aiVerdict,
    status: sanitized.status,
    viewsCount: sanitized.viewsCount,
    likesCount: sanitized.likesCount,
    commentsCount: sanitized.commentsCount,
    createdAt: sanitized.createdAt,
    updatedAt: sanitized.updatedAt
  };
}

/**
 * Sanitizes user profile payload to strictly match firebase-blueprint.json & firestore.rules.
 */
export function sanitizeUserProfilePayload(raw: UserProfile): UserProfile {
  const cleanUid = raw.uid.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128) || 'user_1';
  const cleanUsername =
    raw.username.replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 50) || `writer_${cleanUid.slice(0, 6)}`;
  const now = new Date().toISOString();
  const validRoles: AccountRole[] = ['USER', 'ADMIN', 'reader', 'author', 'admin'];
  return {
    uid: cleanUid,
    name: (raw.name || 'Literary Contributor').trim().slice(0, 100),
    username: cleanUsername.length >= 2 ? cleanUsername : `${cleanUsername}_sw`,
    ...(raw.email ? { email: raw.email.trim().toLowerCase().slice(0, 120) } : {}),
    ...(raw.preferredLanguage && ['en', 'ar', 'ml'].includes(raw.preferredLanguage)
      ? { preferredLanguage: raw.preferredLanguage }
      : {}),
    bio: (raw.bio || '').trim().slice(0, 500),
    photoUrl: (raw.photoUrl || '').slice(0, 200000),
    isVerified: Boolean(raw.isVerified),
    role: validRoles.includes(raw.role) ? raw.role : 'USER',
    ...(raw.accountStatus && ['active', 'suspended'].includes(raw.accountStatus)
      ? { accountStatus: raw.accountStatus }
      : {}),
    visibility: 'public',
    followersCount: Math.max(0, Math.floor(Number(raw.followersCount) || 0)),
    followingCount: Math.max(0, Math.floor(Number(raw.followingCount) || 0)),
    ...(typeof raw.emailNotifications === 'boolean'
      ? { emailNotifications: raw.emailNotifications }
      : {}),
    ...(typeof raw.editorialAlerts === 'boolean'
      ? { editorialAlerts: raw.editorialAlerts }
      : {}),
    createdAt: (raw.createdAt || now).slice(0, 64),
    updatedAt: (raw.updatedAt || now).slice(0, 64)
  };
}

/**
 * Strict Firestore-compatible public user profile document (zero PII).
 */
export function toFirestoreUserDoc(raw: UserProfile) {
  const s = sanitizeUserProfilePayload(raw);
  const firestoreRole = isAdminRole(s.role) ? 'admin' : s.role === 'reader' ? 'reader' : 'author';
  return {
    uid: s.uid,
    name: s.name,
    username: s.username,
    bio: s.bio,
    photoUrl: s.photoUrl,
    isVerified: s.isVerified,
    role: firestoreRole,
    visibility: 'public' as const,
    followersCount: s.followersCount,
    followingCount: s.followingCount,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
}
