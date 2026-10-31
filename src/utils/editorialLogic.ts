export type LanguageCode = 'en' | 'ar' | 'ml';
export type LiterarySection = 'fiction' | 'poetry' | 'non-fiction';
export type PostStatus = 'pending' | 'published' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  username: string;
  bio: string;
  photoUrl: string;
  isVerified: boolean;
  role: 'reader' | 'author' | 'admin';
  visibility: 'public';
  followersCount: number;
  followingCount: number;
  createdAt: string;
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
  title: string;
  subtitle: string;
  content: string;
  coverUrl: string;
  aiScore: number;
  aiVerdict: string;
  status: PostStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
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
  type: 'published' | 'submission' | 'verified' | 'new_account';
  title: string;
  postId: string;
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

export const CHIEF_EDITOR_EMAIL = 'mohammedmusthafac3@gmail.com';
export const OFFICIAL_SAFWA_UID = 'safwa_official_account';

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

/**
 * Sanitizes and truncates post payload to strictly match firebase-blueprint.json & firestore.rules.
 */
export function sanitizePostPayload(
  raw: Omit<LiteraryPost, 'id'>
): Omit<LiteraryPost, 'id'> {
  const cleanId = (val: string) => val.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128) || 'user_1';
  const now = new Date().toISOString();
  return {
    authorId: cleanId(raw.authorId),
    authorName: (raw.authorName || 'Anonymous Author').trim().slice(0, 100),
    authorUsername: (raw.authorUsername || 'author').trim().slice(0, 50),
    authorPhoto: (raw.authorPhoto || '').slice(0, 200000),
    authorVerified: Boolean(raw.authorVerified),
    language: ['en', 'ar', 'ml'].includes(raw.language) ? raw.language : 'en',
    section: ['fiction', 'poetry', 'non-fiction'].includes(raw.section) ? raw.section : 'fiction',
    title: (raw.title || 'Untitled').trim().slice(0, 200),
    subtitle: (raw.subtitle || '').trim().slice(0, 300),
    content: (raw.content || '').trim().slice(0, 50000),
    coverUrl: (raw.coverUrl || '').slice(0, 300000),
    aiScore: Math.max(0, Math.min(100, Math.round(Number(raw.aiScore) || 0))),
    aiVerdict: (raw.aiVerdict || 'Analyzed by Safwa Editorial AI Guard').slice(0, 500),
    status: ['pending', 'published', 'rejected'].includes(raw.status) ? raw.status : 'pending',
    viewsCount: Math.max(0, Math.floor(Number(raw.viewsCount) || 0)),
    likesCount: Math.max(0, Math.floor(Number(raw.likesCount) || 0)),
    commentsCount: Math.max(0, Math.floor(Number(raw.commentsCount) || 0)),
    createdAt: (raw.createdAt || now).slice(0, 64),
    updatedAt: (raw.updatedAt || now).slice(0, 64)
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
  return {
    uid: cleanUid,
    name: (raw.name || 'Literary Contributor').trim().slice(0, 100),
    username: cleanUsername.length >= 2 ? cleanUsername : `${cleanUsername}_sw`,
    bio: (raw.bio || '').trim().slice(0, 500),
    photoUrl: (raw.photoUrl || '').slice(0, 200000),
    isVerified: Boolean(raw.isVerified),
    role: ['reader', 'author', 'admin'].includes(raw.role) ? raw.role : 'author',
    visibility: 'public',
    followersCount: Math.max(0, Math.floor(Number(raw.followersCount) || 0)),
    followingCount: Math.max(0, Math.floor(Number(raw.followingCount) || 0)),
    createdAt: (raw.createdAt || now).slice(0, 64),
    updatedAt: (raw.updatedAt || now).slice(0, 64)
  };
}
