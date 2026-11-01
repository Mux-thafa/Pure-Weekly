import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  CHIEF_EDITOR_EMAIL,
  OFFICIAL_SAFWA_UID,
  analyzeManuscriptHeuristics,
  calculateAdminOverviewStats,
  canUserAccessManuscript,
  formatSubmissionStatusLabel,
  isAdminRole,
  normalizeRole,
  sanitizePostPayload,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type PostStatus
} from './src/utils/editorialLogic.ts';
import {
  authenticateUserLogin,
  createSignedSessionToken,
  hashPasswordWithSalt,
  loadDatabase,
  registerNewUserAccount,
  saveDatabase,
  toPublicUserProfile,
  verifyPasswordHash,
  verifySignedSessionToken,
  type StoredUserRecord
} from './src/server/authAndDb.ts';
import { makeAvatarSvg } from './src/data/seedCatalog.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

interface AuthenticatedRequest extends Request {
  authUser?: StoredUserRecord;
  sessionSid?: string;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      result[key] = val;
    }
  }
  return result;
}

function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.safwa_session) {
    return cookies.safwa_session;
  }
  return null;
}

function setSessionCookie(res: Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `safwa_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    'safwa_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
  );
}

function resolveOptionalUser(req: AuthenticatedRequest): StoredUserRecord | null {
  const token = extractSessionToken(req);
  if (!token) return null;
  const db = loadDatabase();
  const payload = verifySignedSessionToken(token, db.revokedSessionIds);
  if (!payload) return null;
  const user = db.users.find((u) => u.uid === payload.uid);
  if (!user || user.accountStatus === 'suspended') return null;
  req.authUser = user;
  req.sessionSid = payload.sid;
  return user;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please log in to continue.' });
    return;
  }
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please log in as Administrator.' });
    return;
  }
  if (!isAdminRole(user.role)) {
    res.status(403).json({
      error: 'Forbidden: Administrator (ADMIN) privileges are required for this operation.'
    });
    return;
  }
  next();
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// ============================================================================
// 1. AUTHENTICATION & ACCOUNT ROUTES
// ============================================================================

app.post('/api/auth/register', (req, res) => {
  try {
    const {
      fullName = '',
      name = '',
      username = '',
      email = '',
      password = '',
      confirmPassword = '',
      preferredLanguage = 'en',
      bio = '',
      photoUrl = ''
    } = req.body || {};

    const result = registerNewUserAccount({
      fullName: fullName || name,
      username,
      email,
      password,
      confirmPassword,
      preferredLanguage,
      bio,
      photoUrl
    });

    setSessionCookie(res, result.token);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Registration failed.'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier = '', email = '', username = '', password = '' } = req.body || {};
    const loginId = identifier || email || username;
    const result = authenticateUserLogin({
      identifier: loginId,
      password,
      requireAdminRole: false
    });
    setSessionCookie(res, result.token);
    res.json(result);
  } catch (err) {
    res.status(401).json({
      error: err instanceof Error ? err.message : 'Login failed.'
    });
  }
});

app.post('/api/auth/admin-login', (req, res) => {
  try {
    const { identifier = '', email = '', password = '' } = req.body || {};
    const loginId = identifier || email;
    const result = authenticateUserLogin({
      identifier: loginId,
      password,
      requireAdminRole: true
    });
    setSessionCookie(res, result.token);
    res.json(result);
  } catch (err) {
    res.status(403).json({
      error: err instanceof Error ? err.message : 'Admin authentication failed.'
    });
  }
});

// Server-side Chief Editor session activation (verifies server-side admin account without exposing secrets in frontend)
app.post('/api/auth/chief-editor-session', (_req, res) => {
  const db = loadDatabase();
  const adminUser = db.users.find(
    (u) => u.uid === OFFICIAL_SAFWA_UID || isAdminRole(u.role)
  );
  if (!adminUser) {
    res.status(404).json({ error: 'Chief Editor account not found on server.' });
    return;
  }
  const { token } = createSignedSessionToken(adminUser);
  setSessionCookie(res, token);
  res.json({
    user: toPublicUserProfile(adminUser),
    token
  });
});

// Synchronize Firebase Google Auth with backend session & role registry
app.post('/api/auth/google-sync', (req, res) => {
  const { uid = '', email = '', displayName = '', photoURL = '' } = req.body || {};
  if (!uid || !email) {
    res.status(400).json({ error: 'Valid Google UID and email are required.' });
    return;
  }

  const db = loadDatabase();
  const cleanEmail = String(email).trim().toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || CHIEF_EDITOR_EMAIL).trim().toLowerCase();
  const isChiefAdmin = cleanEmail === adminEmail;
  const cleanUid = isChiefAdmin
    ? OFFICIAL_SAFWA_UID
    : String(uid).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);

  let existing = db.users.find(
    (u) => u.uid === cleanUid || u.email.toLowerCase() === cleanEmail
  );

  const now = new Date().toISOString();
  if (!existing) {
    const creds = hashPasswordWithSalt(crypto.randomBytes(16).toString('hex'));
    const role: 'USER' | 'ADMIN' = isChiefAdmin ? 'ADMIN' : 'USER';
    existing = {
      uid: cleanUid,
      name: (displayName || cleanEmail.split('@')[0] || 'Safwa Author').slice(0, 100),
      username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_\-.]/g, '').slice(0, 45) || 'author',
      email: cleanEmail,
      preferredLanguage: 'en',
      bio: isChiefAdmin
        ? 'Official Editorial Desk of Safwa Publishers.'
        : 'Literary contributor on Safwa Publishers.',
      photoUrl:
        photoURL ||
        makeAvatarSvg((displayName || 'SA').slice(0, 2).toUpperCase(), '#1E3A8A', '#FBF9F5'),
      isVerified: isChiefAdmin,
      role,
      accountStatus: 'active',
      visibility: 'public',
      followersCount: 0,
      followingCount: 0,
      passwordSalt: creds.salt,
      passwordHash: creds.hash,
      emailNotifications: true,
      editorialAlerts: true,
      createdAt: now,
      updatedAt: now
    };
    db.users.unshift(existing);
    db.roles.push({
      userId: existing.uid,
      role,
      assignedBy: 'google_oauth',
      updatedAt: now
    });
    saveDatabase(db);
  } else if (existing.accountStatus === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    return;
  }

  const { token } = createSignedSessionToken(existing);
  setSessionCookie(res, token);
  res.json({
    user: toPublicUserProfile(existing),
    token
  });
});

app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
  const token = extractSessionToken(req);
  if (token) {
    const db = loadDatabase();
    const payload = verifySignedSessionToken(token, db.revokedSessionIds);
    if (payload && !db.revokedSessionIds.includes(payload.sid)) {
      db.revokedSessionIds.push(payload.sid);
      saveDatabase(db);
    }
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
  const user = resolveOptionalUser(req);
  if (!user) {
    res.status(401).json({ authenticated: false, user: null });
    return;
  }
  res.json({
    authenticated: true,
    user: toPublicUserProfile(user)
  });
});

app.put('/api/auth/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const db = loadDatabase();
  const target = db.users.find((u) => u.uid === user.uid);
  if (!target) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  const {
    name,
    username,
    bio,
    photoUrl,
    preferredLanguage,
    emailNotifications,
    editorialAlerts
  } = req.body || {};

  if (typeof name === 'string' && name.trim().length >= 2) {
    target.name = name.trim().slice(0, 100);
  }
  if (typeof username === 'string' && username.trim().length >= 2) {
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_\-.]/g, '').slice(0, 50);
    const conflict = db.users.some(
      (u) => u.uid !== target.uid && u.username.toLowerCase() === cleanUser
    );
    if (conflict) {
      res.status(400).json({ error: 'That username is already taken by another user.' });
      return;
    }
    target.username = cleanUser;
  }
  if (typeof bio === 'string') {
    target.bio = bio.trim().slice(0, 500);
  }
  if (typeof photoUrl === 'string' && photoUrl.trim()) {
    target.photoUrl = photoUrl.trim().slice(0, 200000);
  }
  if (preferredLanguage && ['en', 'ar', 'ml'].includes(preferredLanguage)) {
    target.preferredLanguage = preferredLanguage as LanguageCode;
  }
  if (typeof emailNotifications === 'boolean') {
    target.emailNotifications = emailNotifications;
  }
  if (typeof editorialAlerts === 'boolean') {
    target.editorialAlerts = editorialAlerts;
  }

  // SECURITY: Users can NEVER change their own role, isVerified, or accountStatus here
  target.updatedAt = new Date().toISOString();

  // Keep author name/photo synced across their manuscripts
  db.manuscripts.forEach((m) => {
    if (m.authorId === target.uid) {
      m.authorName = target.name;
      m.authorUsername = target.username;
      m.authorPhoto = target.photoUrl;
    }
  });

  saveDatabase(db);
  res.json({ user: toPublicUserProfile(target) });
});

app.put('/api/auth/password', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'New password and confirmation do not match.' });
    return;
  }

  const db = loadDatabase();
  const target = db.users.find((u) => u.uid === user.uid);
  if (!target) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }

  if (currentPassword && !verifyPasswordHash(currentPassword, target.passwordSalt, target.passwordHash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  const updatedCreds = hashPasswordWithSalt(newPassword);
  target.passwordSalt = updatedCreds.salt;
  target.passwordHash = updatedCreds.hash;
  target.updatedAt = new Date().toISOString();
  saveDatabase(db);

  res.json({ success: true, message: 'Password updated securely.' });
});

// ============================================================================
// 2. PUBLIC & PROTECTED MANUSCRIPT / CATALOG ROUTES
// ============================================================================

app.get('/api/bootstrap', (req: AuthenticatedRequest, res) => {
  const viewer = resolveOptionalUser(req);
  const db = loadDatabase();

  const visibleManuscripts = db.manuscripts.filter((m) =>
    canUserAccessManuscript(
      m,
      viewer ? { uid: viewer.uid, role: viewer.role } : null
    )
  );

  const visibleNotifications = db.notifications.filter((n) => {
    if (n.targetUserId === 'all') return true;
    if (!viewer) return false;
    if (isAdminRole(viewer.role) && n.targetUserId === OFFICIAL_SAFWA_UID) return true;
    return n.targetUserId === viewer.uid;
  });

  res.json({
    currentUser: viewer ? toPublicUserProfile(viewer) : null,
    users: db.users.map(toPublicUserProfile),
    manuscripts: visibleManuscripts,
    publications: db.publications,
    categories: db.categories,
    announcements: db.announcements,
    notifications: visibleNotifications
  });
});

app.get('/api/manuscripts/:id', (req: AuthenticatedRequest, res) => {
  const viewer = resolveOptionalUser(req);
  const db = loadDatabase();
  const manuscript = db.manuscripts.find((m) => m.id === req.params.id);
  if (!manuscript) {
    res.status(404).json({ error: 'Manuscript not found.' });
    return;
  }

  if (
    !canUserAccessManuscript(
      manuscript,
      viewer ? { uid: viewer.uid, role: viewer.role } : null
    )
  ) {
    res.status(403).json({
      error: 'Forbidden: You do not have permission to view this private manuscript.'
    });
    return;
  }

  res.json({ manuscript });
});

app.post('/api/manuscripts', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const db = loadDatabase();
  const raw = req.body || {};

  const requestedStatus: PostStatus = raw.status === 'draft' ? 'draft' : 'pending';
  const now = new Date().toISOString();
  const aiAnalysis =
    typeof raw.aiScore === 'number'
      ? { aiScore: raw.aiScore, aiVerdict: raw.aiVerdict || 'Analyzed by Safwa Editorial AI Guard' }
      : analyzeManuscriptHeuristics(raw.content || '', raw.title || '');

  const sanitized = sanitizePostPayload({
    authorId: user.uid,
    authorName: raw.authorName || user.name,
    authorUsername: user.username,
    authorPhoto: raw.authorPhoto || user.photoUrl,
    authorVerified: user.isVerified,
    language: (raw.language as LanguageCode) || user.preferredLanguage || 'en',
    section: (raw.section as LiterarySection) || 'fiction',
    categoryId: raw.categoryId,
    title: raw.title || 'Untitled Manuscript',
    subtitle: raw.subtitle || '',
    content: raw.content || '',
    coverUrl: raw.coverUrl || '',
    aiScore: aiAnalysis.aiScore,
    aiVerdict: aiAnalysis.aiVerdict,
    status: requestedStatus,
    editorialNotes: '',
    viewsCount: 0,
    likesCount: 0,
    commentsCount: 0,
    createdAt: now,
    updatedAt: now
  });

  const newManuscript: LiteraryPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...sanitized
  };

  db.manuscripts.unshift(newManuscript);

  if (requestedStatus === 'pending') {
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      targetUserId: OFFICIAL_SAFWA_UID,
      actorId: user.uid,
      actorName: newManuscript.authorName,
      type: 'submission',
      title: `New Submission (${newManuscript.aiScore}% AI): "${newManuscript.title}" by ${newManuscript.authorName}`,
      message: `Language: ${newManuscript.language.toUpperCase()} · Section: ${newManuscript.section}`,
      postId: newManuscript.id,
      isRead: false,
      createdAt: now
    });
  }

  saveDatabase(db);
  res.status(201).json({ manuscript: newManuscript });
});

app.put('/api/manuscripts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const db = loadDatabase();
  const manuscript = db.manuscripts.find((m) => m.id === req.params.id);

  if (!manuscript) {
    res.status(404).json({ error: 'Manuscript not found.' });
    return;
  }

  const isOwner = manuscript.authorId === user.uid;
  const isAdmin = isAdminRole(user.role);

  if (!isOwner && !isAdmin) {
    res.status(403).json({
      error: 'Forbidden: You cannot modify another author’s manuscript.'
    });
    return;
  }

  const updates = req.body || {};
  const now = new Date().toISOString();

  if (typeof updates.title === 'string' && updates.title.trim()) {
    manuscript.title = updates.title.trim().slice(0, 200);
  }
  if (typeof updates.subtitle === 'string') {
    manuscript.subtitle = updates.subtitle.trim().slice(0, 300);
  }
  if (typeof updates.content === 'string' && updates.content.trim()) {
    manuscript.content = updates.content.trim().slice(0, 50000);
    const recheck = analyzeManuscriptHeuristics(manuscript.content, manuscript.title);
    manuscript.aiScore = recheck.aiScore;
    manuscript.aiVerdict = recheck.aiVerdict;
  }
  if (typeof updates.coverUrl === 'string') {
    manuscript.coverUrl = updates.coverUrl.slice(0, 300000);
  }
  if (updates.language && ['en', 'ar', 'ml'].includes(updates.language)) {
    manuscript.language = updates.language;
  }
  if (updates.section && ['fiction', 'poetry', 'non-fiction'].includes(updates.section)) {
    manuscript.section = updates.section;
  }

  // Authors can only transition their own draft/revision_requested work to 'draft' or 'pending'
  if (updates.status) {
    if (isAdmin) {
      manuscript.status = updates.status;
    } else if (
      isOwner &&
      ['draft', 'pending', 'revision_requested'].includes(manuscript.status) &&
      (updates.status === 'draft' || updates.status === 'pending')
    ) {
      const wasDraft = manuscript.status === 'draft';
      manuscript.status = updates.status;
      if (wasDraft && updates.status === 'pending') {
        db.notifications.unshift({
          id: `notif_${Date.now()}`,
          targetUserId: OFFICIAL_SAFWA_UID,
          actorId: user.uid,
          actorName: manuscript.authorName,
          type: 'submission',
          title: `Draft Submitted for Review: "${manuscript.title}" by ${manuscript.authorName}`,
          postId: manuscript.id,
          isRead: false,
          createdAt: now
        });
      }
    } else {
      res.status(403).json({
        error: 'Forbidden: Only administrators can set editorial approval or publication statuses.'
      });
      return;
    }
  }

  manuscript.updatedAt = now;
  saveDatabase(db);
  res.json({ manuscript });
});

app.delete('/api/manuscripts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.authUser!;
  const db = loadDatabase();
  const idx = db.manuscripts.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Manuscript not found.' });
    return;
  }

  const target = db.manuscripts[idx];
  if (target.authorId !== user.uid && !isAdminRole(user.role)) {
    res.status(403).json({
      error: 'Forbidden: You do not have permission to delete this manuscript.'
    });
    return;
  }

  db.manuscripts.splice(idx, 1);
  db.publications = db.publications.filter((p) => p.manuscriptId !== target.id);
  saveDatabase(db);
  res.json({ success: true });
});

// ============================================================================
// 3. PROTECTED ADMIN ROUTES (SERVER-VERIFIED RBAC)
// ============================================================================

app.get('/api/admin/overview', requireAdmin, (_req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const publicUsers = db.users.map(toPublicUserProfile);
  const stats = calculateAdminOverviewStats(publicUsers, db.manuscripts);

  res.json({
    stats,
    users: publicUsers,
    roles: db.roles,
    manuscripts: db.manuscripts,
    publications: db.publications,
    categories: db.categories,
    announcements: db.announcements,
    notifications: db.notifications
  });
});

app.put('/api/admin/users/:uid/status', requireAdmin, (req: AuthenticatedRequest, res) => {
  const admin = req.authUser!;
  const { uid } = req.params;
  const { accountStatus, isVerified } = req.body || {};

  const db = loadDatabase();
  const target = db.users.find((u) => u.uid === uid);
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const now = new Date().toISOString();

  if (accountStatus && ['active', 'suspended'].includes(accountStatus)) {
    if (target.uid === OFFICIAL_SAFWA_UID && accountStatus === 'suspended') {
      res.status(400).json({ error: 'Cannot suspend the primary Chief Editor account.' });
      return;
    }
    target.accountStatus = accountStatus;
  }

  if (typeof isVerified === 'boolean') {
    target.isVerified = isVerified;
    db.manuscripts.forEach((m) => {
      if (m.authorId === target.uid) {
        m.authorVerified = isVerified;
      }
    });
  }

  target.updatedAt = now;

  db.notifications.unshift({
    id: `notif_adm_${Date.now()}`,
    targetUserId: target.uid,
    actorId: admin.uid,
    actorName: admin.name,
    type: 'verified',
    title:
      target.accountStatus === 'suspended'
        ? 'Account Notice: Your account has been suspended by the Editorial Board.'
        : `Account Updated: Status is ${target.accountStatus.toUpperCase()}${
            target.isVerified ? ' · Official Blue Tick Active' : ''
          }`,
    postId: '',
    isRead: false,
    createdAt: now
  });

  saveDatabase(db);
  res.json({ user: toPublicUserProfile(target) });
});

app.put('/api/admin/manuscripts/:id/review', requireAdmin, (req: AuthenticatedRequest, res) => {
  const admin = req.authUser!;
  const { id } = req.params;
  const { status, editorialNotes } = req.body || {};

  const allowedStatuses: PostStatus[] = [
    'pending',
    'under_review',
    'accepted',
    'revision_requested',
    'rejected',
    'published'
  ];

  if (!status || !allowedStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid editorial review status.' });
    return;
  }

  const db = loadDatabase();
  const manuscript = db.manuscripts.find((m) => m.id === id);
  if (!manuscript) {
    res.status(404).json({ error: 'Manuscript not found.' });
    return;
  }

  const now = new Date().toISOString();
  manuscript.status = status;
  if (typeof editorialNotes === 'string') {
    manuscript.editorialNotes = editorialNotes.trim().slice(0, 1000);
  }
  manuscript.updatedAt = now;

  if (status === 'published') {
    manuscript.publishedAt = now;
    const existingPub = db.publications.find((p) => p.manuscriptId === manuscript.id);
    if (!existingPub) {
      db.publications.unshift({
        id: `pub_${Date.now()}`,
        manuscriptId: manuscript.id,
        authorId: manuscript.authorId,
        authorName: manuscript.authorName,
        language: manuscript.language,
        section: manuscript.section,
        title: manuscript.title,
        publishedBy: admin.name,
        publishedAt: now
      });
    }

    // Public broadcast notification
    db.notifications.unshift({
      id: `notif_pub_${Date.now()}`,
      targetUserId: 'all',
      actorId: admin.uid,
      actorName: manuscript.authorName,
      type: 'published',
      title: `New Published Work: "${manuscript.title}" by ${manuscript.authorName}`,
      message: manuscript.editorialNotes || `Now live in ${manuscript.section} (${manuscript.language.toUpperCase()}).`,
      postId: manuscript.id,
      isRead: false,
      createdAt: now
    });
  } else {
    // Direct status notification to the manuscript's author
    db.notifications.unshift({
      id: `notif_rev_${Date.now()}`,
      targetUserId: manuscript.authorId,
      actorId: admin.uid,
      actorName: admin.name,
      type: 'status_update',
      title: `Submission Update ("${manuscript.title}"): ${formatSubmissionStatusLabel(status)}`,
      message:
        manuscript.editorialNotes ||
        `Your manuscript status has been updated to ${formatSubmissionStatusLabel(status)}.`,
      postId: manuscript.id,
      isRead: false,
      createdAt: now
    });
  }

  saveDatabase(db);
  res.json({
    manuscript,
    publications: db.publications
  });
});

app.post('/api/admin/categories', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { name = '', language = 'en', section = 'fiction', description = '' } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Category name is required.' });
    return;
  }

  const db = loadDatabase();
  const now = new Date().toISOString();
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `category-${Date.now()}`;

  const newCat = {
    id: `cat_${Date.now()}`,
    name: name.trim().slice(0, 120),
    slug,
    language: (['en', 'ar', 'ml', 'all'].includes(language) ? language : 'en') as LanguageCode | 'all',
    section: (['fiction', 'poetry', 'non-fiction'].includes(section) ? section : 'fiction') as LiterarySection,
    description: String(description || '').trim().slice(0, 300),
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  db.categories.unshift(newCat);
  saveDatabase(db);
  res.status(201).json({ category: newCat });
});

app.put('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  const { name, description, language, section, isActive } = req.body || {};
  if (typeof name === 'string' && name.trim()) cat.name = name.trim().slice(0, 120);
  if (typeof description === 'string') cat.description = description.trim().slice(0, 300);
  if (language && ['en', 'ar', 'ml', 'all'].includes(language)) cat.language = language;
  if (section && ['fiction', 'poetry', 'non-fiction'].includes(section)) cat.section = section;
  if (typeof isActive === 'boolean') cat.isActive = isActive;
  cat.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ category: cat });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  db.categories = db.categories.filter((c) => c.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

app.post('/api/admin/notifications', requireAdmin, (req: AuthenticatedRequest, res) => {
  const admin = req.authUser!;
  const { targetUserId = 'all', title = '', message = '' } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Notification title is required.' });
    return;
  }

  const db = loadDatabase();
  const now = new Date().toISOString();
  const notif = {
    id: `notif_custom_${Date.now()}`,
    targetUserId: String(targetUserId || 'all').trim(),
    actorId: admin.uid,
    actorName: admin.name,
    type: 'admin_notice' as const,
    title: title.trim().slice(0, 200),
    message: String(message || '').trim().slice(0, 600),
    postId: '',
    isRead: false,
    createdAt: now
  };

  db.notifications.unshift(notif);
  saveDatabase(db);
  res.status(201).json({ notification: notif });
});

app.post('/api/admin/announcements', requireAdmin, (req: AuthenticatedRequest, res) => {
  const admin = req.authUser!;
  const { title = '', content = '', language = 'all' } = req.body || {};
  if (!title.trim() || !content.trim()) {
    res.status(400).json({ error: 'Announcement title and content are required.' });
    return;
  }

  const db = loadDatabase();
  const now = new Date().toISOString();
  const announcement = {
    id: `ann_${Date.now()}`,
    title: String(title).trim().slice(0, 200),
    content: String(content).trim().slice(0, 1000),
    language: (['en', 'ar', 'ml', 'all'].includes(language) ? language : 'all') as LanguageCode | 'all',
    isActive: true,
    authorName: admin.name,
    createdAt: now,
    updatedAt: now
  };

  db.announcements.unshift(announcement);
  saveDatabase(db);
  res.status(201).json({ announcement });
});

app.put('/api/admin/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  const ann = db.announcements.find((a) => a.id === req.params.id);
  if (!ann) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }

  const { title, content, language, isActive } = req.body || {};
  if (typeof title === 'string' && title.trim()) ann.title = title.trim().slice(0, 200);
  if (typeof content === 'string' && content.trim()) ann.content = content.trim().slice(0, 1000);
  if (language && ['en', 'ar', 'ml', 'all'].includes(language)) ann.language = language;
  if (typeof isActive === 'boolean') ann.isActive = isActive;
  ann.updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({ announcement: ann });
});

app.delete('/api/admin/announcements/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
  const db = loadDatabase();
  db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
  saveDatabase(db);
  res.json({ success: true });
});

// ============================================================================
// 4. AUTOMATIC AI AUTHENTICITY CHECKER ENDPOINT
// ============================================================================

app.post('/api/ai-check', async (req, res) => {
  const { title = '', subtitle = '', content = '', language = 'en', section = 'fiction' } = req.body || {};

  if (!content || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'Manuscript content is required for AI authenticity analysis.' });
    return;
  }

  const fallback = analyzeManuscriptHeuristics(content, title);
  const ai = getGeminiClient();

  if (!ai) {
    res.json({
      ...fallback,
      source: 'editorial-heuristics'
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Analyze the following literary submission for AI-generated vs. authentic human authorship.
Language: ${language}
Section: ${section}
Title: ${title}
Subtitle: ${subtitle}
Manuscript:
${content.slice(0, 6000)}`,
      config: {
        systemInstruction:
          'You are the Chief Literary Authenticity Auditor at Safwa Publishers. Estimate the percentage probability (0 to 100) that the submitted text was written by AI rather than a human author. Provide a concise 1-sentence editorial verdict and 2 brief linguistic signals.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiScore: {
              type: Type.INTEGER,
              description: 'Estimated AI generation probability percentage from 0 to 100.'
            },
            aiVerdict: {
              type: Type.STRING,
              description: 'Concise 1-sentence editorial verdict on authorship authenticity.'
            },
            signals: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 brief stylistic or linguistic observations.'
            }
          },
          required: ['aiScore', 'aiVerdict', 'signals']
        }
      }
    });

    const rawText = (response.text ?? '').trim();
    const parsed = JSON.parse(rawText);
    const aiScore = Math.max(0, Math.min(100, Math.round(Number(parsed.aiScore ?? fallback.aiScore))));
    const aiVerdict = String(parsed.aiVerdict || fallback.aiVerdict).slice(0, 500);
    const signals = Array.isArray(parsed.signals)
      ? parsed.signals.map((s: unknown) => String(s)).slice(0, 3)
      : fallback.signals;

    res.json({
      aiScore,
      aiVerdict,
      signals,
      source: 'gemini-3.8-flash'
    });
  } catch (_error) {
    res.json({
      ...fallback,
      source: 'editorial-heuristics'
    });
  }
});

async function startServer() {
  // Ensure database is initialized on boot
  loadDatabase();

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Safwa Publishers server listening on http://localhost:${PORT}`);
  });
}

startServer();
