import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  CHIEF_EDITOR_EMAIL,
  OFFICIAL_SAFWA_UID,
  canUserAccessManuscript,
  isAdminRole,
  normalizeRole,
  sanitizePostPayload,
  sanitizeUserProfilePayload,
  type AccountStatus,
  type AnnouncementItem,
  type CategoryItem,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type NotificationItem,
  type PostStatus,
  type PublicationRecord,
  type RoleRecord,
  type UserProfile
} from '../utils/editorialLogic.ts';
import { SEED_USERS, makeAvatarSvg } from '../data/seedCatalog.ts';

export interface StoredUserRecord extends UserProfile {
  email: string;
  preferredLanguage: LanguageCode;
  role: 'USER' | 'ADMIN';
  accountStatus: AccountStatus;
  passwordSalt: string;
  passwordHash: string;
  emailNotifications: boolean;
  editorialAlerts: boolean;
}

export interface SessionPayload {
  sid: string;
  uid: string;
  email: string;
  role: 'USER' | 'ADMIN';
  iat: number;
  exp: number;
}

export interface SafwaDatabaseSchema {
  users: StoredUserRecord[];
  roles: RoleRecord[];
  manuscripts: LiteraryPost[];
  publications: PublicationRecord[];
  notifications: NotificationItem[];
  categories: CategoryItem[];
  announcements: AnnouncementItem[];
  revokedSessionIds: string[];
}

const RUNTIME_SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'CHANGE_ME_SERVER_SESSION_SECRET'
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'safwa_db.json');

export function hashPasswordWithSalt(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, actualSalt, 64);
  return {
    salt: actualSalt,
    hash: derivedKey.toString('hex')
  };
}

export function verifyPasswordHash(password: string, salt: string, expectedHash: string): boolean {
  if (!password || !salt || !expectedHash) return false;
  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    if (derivedKey.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, expectedBuffer);
  } catch {
    return false;
  }
}

export function createSignedSessionToken(user: Pick<StoredUserRecord, 'uid' | 'email' | 'role'>): {
  token: string;
  payload: SessionPayload;
} {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sid: crypto.randomBytes(12).toString('hex'),
    uid: user.uid,
    email: user.email,
    role: normalizeRole(user.role),
    iat: nowSec,
    exp: nowSec + 60 * 60 * 24 * 7 // 7 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${signature}`,
    payload
  };
}

export function verifySignedSessionToken(
  token: string,
  revokedIds: string[] = []
): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', RUNTIME_SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');

  try {
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp < nowSec) {
      return null;
    }
    if (revokedIds.includes(decoded.sid)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function createDefaultCategories(now: string): CategoryItem[] {
  return [
    {
      id: 'cat_ar_poetry',
      name: 'Classical & Modern Arabic Poetry (الشعر العربي)',
      slug: 'arabic-poetry',
      language: 'ar',
      section: 'poetry',
      description: 'Qasidas, free verse, and contemporary Arabic poetic forms.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_ar_fiction',
      name: 'Arabic Short Fiction & Novellas (السرد القصصي)',
      slug: 'arabic-fiction',
      language: 'ar',
      section: 'fiction',
      description: 'Original narrative fiction and literary prose in Arabic.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_ar_nonfiction',
      name: 'Arabic Literary Criticism & Essays (المقالات والدراسات)',
      slug: 'arabic-nonfiction',
      language: 'ar',
      section: 'non-fiction',
      description: 'Cultural monographs, critical essays, and historical reflections in Arabic.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_ml_poetry',
      name: 'Malayalam Kavitha (മലയാള കവിത)',
      slug: 'malayalam-poetry',
      language: 'ml',
      section: 'poetry',
      description: 'Contemporary and traditional Malayalam poetry.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_ml_fiction',
      name: 'Malayalam Katha & Fiction (ചെറുകഥ)',
      slug: 'malayalam-fiction',
      language: 'ml',
      section: 'fiction',
      description: 'Short stories and literary narratives in Malayalam.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_ml_nonfiction',
      name: 'Malayalam Essays & Non-Fiction (ലേഖനങ്ങൾ)',
      slug: 'malayalam-nonfiction',
      language: 'ml',
      section: 'non-fiction',
      description: 'Literary essays, travelogues, and cultural studies in Malayalam.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_en_poetry',
      name: 'English Verse & Poetics',
      slug: 'english-poetry',
      language: 'en',
      section: 'poetry',
      description: 'Original lyric poetry, translations, and experimental verse in English.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_en_fiction',
      name: 'English Literary Fiction',
      slug: 'english-fiction',
      language: 'en',
      section: 'fiction',
      description: 'Short fiction, novellas, and cross-cultural narratives in English.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'cat_en_nonfiction',
      name: 'English Monographs & Essays',
      slug: 'english-nonfiction',
      language: 'en',
      section: 'non-fiction',
      description: 'Long-form essays, archival studies, and literary criticism in English.',
      isActive: true,
      createdAt: now,
      updatedAt: now
    }
  ];
}

function createInitialDatabase(): SafwaDatabaseSchema {
  const now = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_EMAIL || CHIEF_EDITOR_EMAIL).trim().toLowerCase();
  const adminBootstrapSecret =
    process.env.ADMIN_INITIAL_PASSWORD &&
    process.env.ADMIN_INITIAL_PASSWORD !== 'CHANGE_ME_ADMIN_PASSWORD'
      ? process.env.ADMIN_INITIAL_PASSWORD
      : `SafwaAdmin!${crypto.createHash('sha256').update(adminEmail).digest('hex').slice(0, 8)}`;

  const adminCreds = hashPasswordWithSalt(adminBootstrapSecret);

  const seededUsers: StoredUserRecord[] = SEED_USERS.map((u, index) => {
    const isMainAdmin = u.uid === OFFICIAL_SAFWA_UID || isAdminRole(u.role);
    const email = isMainAdmin ? adminEmail : `${u.username}@safwapublishers.org`;
    const userCreds = isMainAdmin
      ? adminCreds
      : hashPasswordWithSalt(`AuthorPass!${index + 100}`);

    return {
      ...u,
      email,
      preferredLanguage: index === 1 ? 'ar' : index === 2 ? 'ml' : 'en',
      role: isMainAdmin ? 'ADMIN' : 'USER',
      accountStatus: 'active',
      passwordSalt: userCreds.salt,
      passwordHash: userCreds.hash,
      emailNotifications: true,
      editorialAlerts: true,
      createdAt: u.createdAt || now,
      updatedAt: u.updatedAt || now
    };
  });

  const roles: RoleRecord[] = seededUsers.map((u) => ({
    userId: u.uid,
    role: u.role,
    assignedBy: 'system_bootstrap',
    updatedAt: now
  }));

  const announcements: AnnouncementItem[] = [
    {
      id: 'ann_inaugural',
      title: 'Trilingual Manuscript Submissions Now Open for the Quarterly Monograph',
      content:
        'Authors may submit original Fiction, Poetry, and Non-Fiction in Arabic, Malayalam, and English, or save works in progress as private drafts.',
      language: 'all',
      isActive: true,
      authorName: 'Safwa Publishers Official',
      createdAt: now,
      updatedAt: now
    }
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_welcome',
      targetUserId: 'all',
      actorId: OFFICIAL_SAFWA_UID,
      actorName: 'Safwa Publishers Official',
      type: 'published',
      title: 'Welcome to Safwa Publishers. Trilingual Submission Desk is now active.',
      message:
        'Register or sign in to submit manuscripts, save drafts, and track editorial review status.',
      postId: '',
      isRead: false,
      createdAt: now
    }
  ];

  return {
    users: seededUsers,
    roles,
    manuscripts: [],
    publications: [],
    notifications,
    categories: createDefaultCategories(now),
    announcements,
    revokedSessionIds: []
  };
}

let memoryDb: SafwaDatabaseSchema | null = null;

export function loadDatabase(): SafwaDatabaseSchema {
  if (memoryDb) return memoryDb;

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as SafwaDatabaseSchema;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.manuscripts)) {
        memoryDb = {
          users: parsed.users,
          roles: Array.isArray(parsed.roles) ? parsed.roles : [],
          manuscripts: parsed.manuscripts,
          publications: Array.isArray(parsed.publications) ? parsed.publications : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          categories: Array.isArray(parsed.categories) ? parsed.categories : createDefaultCategories(new Date().toISOString()),
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : [],
          revokedSessionIds: Array.isArray(parsed.revokedSessionIds) ? parsed.revokedSessionIds : []
        };
        return memoryDb;
      }
    }
  } catch {
    // Fall back to fresh initialization
  }

  memoryDb = createInitialDatabase();
  saveDatabase(memoryDb);
  return memoryDb;
}

export function saveDatabase(db: SafwaDatabaseSchema): void {
  memoryDb = db;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // Ignore file write errors in read-only environments; memoryDb remains authoritative
  }
}

export function toPublicUserProfile(record: StoredUserRecord): UserProfile {
  return sanitizeUserProfilePayload({
    uid: record.uid,
    name: record.name,
    username: record.username,
    email: record.email,
    preferredLanguage: record.preferredLanguage,
    bio: record.bio,
    photoUrl: record.photoUrl,
    isVerified: record.isVerified,
    role: record.role,
    accountStatus: record.accountStatus || 'active',
    visibility: 'public',
    followersCount: record.followersCount || 0,
    followingCount: record.followingCount || 0,
    emailNotifications: record.emailNotifications ?? true,
    editorialAlerts: record.editorialAlerts ?? true,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  });
}

export function registerNewUserAccount(input: {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  preferredLanguage?: LanguageCode;
  bio?: string;
  photoUrl?: string;
}): { user: UserProfile; token: string } {
  const db = loadDatabase();

  const fullName = (input.fullName || '').trim();
  const rawUsername = (input.username || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\-.]/g, '');
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';
  const confirmPassword = input.confirmPassword || '';
  const preferredLanguage: LanguageCode = ['en', 'ar', 'ml'].includes(
    input.preferredLanguage as LanguageCode
  )
    ? (input.preferredLanguage as LanguageCode)
    : 'en';

  if (fullName.length < 2) {
    throw new Error('Full name must be at least 2 characters long.');
  }
  if (rawUsername.length < 2) {
    throw new Error('Username must be at least 2 characters long (letters, numbers, _, -, .).');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }
  if (password !== confirmPassword) {
    throw new Error('Password and Confirm Password do not match.');
  }

  const emailTaken = db.users.some((u) => u.email.toLowerCase() === email);
  if (emailTaken) {
    throw new Error('An account with this email address is already registered.');
  }

  const usernameTaken = db.users.some((u) => u.username.toLowerCase() === rawUsername);
  if (usernameTaken) {
    throw new Error('This username is already taken. Please choose another.');
  }

  const now = new Date().toISOString();
  const uid = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const { salt, hash } = hashPasswordWithSalt(password);

  // CRITICAL RBAC INVARIANT: Normal registration ALWAYS creates USER accounts.
  const forcedRole: 'USER' = 'USER';

  const newRecord: StoredUserRecord = {
    uid,
    name: fullName.slice(0, 100),
    username: rawUsername.slice(0, 50),
    email,
    preferredLanguage,
    bio: (input.bio || 'Literary contributor at Safwa Publishers.').trim().slice(0, 500),
    photoUrl:
      (input.photoUrl || '').trim() ||
      makeAvatarSvg(fullName.slice(0, 2).toUpperCase(), '#1E3A8A', '#FBF9F5'),
    isVerified: false,
    role: forcedRole,
    accountStatus: 'active',
    visibility: 'public',
    followersCount: 0,
    followingCount: 0,
    passwordSalt: salt,
    passwordHash: hash,
    emailNotifications: true,
    editorialAlerts: true,
    createdAt: now,
    updatedAt: now
  };

  db.users.unshift(newRecord);
  db.roles.push({
    userId: uid,
    role: 'USER',
    assignedBy: 'self_registration',
    updatedAt: now
  });

  // Notify Chief Editor of new account registration
  db.notifications.unshift({
    id: `notif_acct_${Date.now()}`,
    targetUserId: OFFICIAL_SAFWA_UID,
    actorId: uid,
    actorName: newRecord.name,
    type: 'new_account',
    title: `New Account Registered: ${newRecord.name} (@${newRecord.username})`,
    message: `Preferred language: ${preferredLanguage.toUpperCase()}. Account role: USER.`,
    postId: '',
    isRead: false,
    createdAt: now
  });

  saveDatabase(db);

  const { token } = createSignedSessionToken(newRecord);
  return {
    user: toPublicUserProfile(newRecord),
    token
  };
}

export function authenticateUserLogin(input: {
  identifier: string;
  password: string;
  requireAdminRole?: boolean;
}): { user: UserProfile; token: string } {
  const db = loadDatabase();
  const identifier = (input.identifier || '').trim().toLowerCase();
  const password = input.password || '';

  if (!identifier || !password) {
    throw new Error('Please enter both your email/username and password.');
  }

  const user = db.users.find(
    (u) => u.email.toLowerCase() === identifier || u.username.toLowerCase() === identifier
  );

  if (!user || !verifyPasswordHash(password, user.passwordSalt, user.passwordHash)) {
    throw new Error('Invalid email/username or password.');
  }

  if (user.accountStatus === 'suspended') {
    throw new Error(
      'Your account has been suspended by an administrator. Please contact the editorial desk.'
    );
  }

  if (input.requireAdminRole && !isAdminRole(user.role)) {
    throw new Error('Access denied: This login portal requires an Administrator (ADMIN) account.');
  }

  const { token } = createSignedSessionToken(user);
  return {
    user: toPublicUserProfile(user),
    token
  };
}

export { canUserAccessManuscript };
