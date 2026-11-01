import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Edit3,
  BookOpen,
  Sparkles,
  Award,
  LogIn,
  LogOut,
  Eye,
  Heart,
  Users,
  FileText,
  FolderOpen,
  Bell,
  Settings,
  Megaphone,
  Trash2,
  Send,
  Ban,
  RefreshCw,
  Plus,
  Lock
} from 'lucide-react';
import {
  CHIEF_EDITOR_EMAIL,
  calculateAdminOverviewStats,
  calculateAuthorStats,
  formatSubmissionStatusLabel,
  isAdminRole,
  type AnnouncementItem,
  type CategoryItem,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type NotificationItem,
  type PostStatus,
  type UserProfile
} from '../utils/editorialLogic';
import { formatLanguageLabel, formatSectionLabel } from '../data/seedCatalog';
import { BlueTickBadge } from './BlueTickBadge';

export type DashboardTabId =
  | 'my-profile'
  | 'my-submissions'
  | 'notifications'
  | 'settings'
  | 'admin-overview'
  | 'admin-users'
  | 'admin-manuscripts'
  | 'admin-publications'
  | 'admin-categories'
  | 'admin-notifications';

interface DashboardAndAdminViewProps {
  currentUser: UserProfile;
  authEmail: string | null;
  isAuthenticated: boolean;
  isGoogleSignedIn: boolean;
  activeTab?: DashboardTabId;
  onSelectTab?: (tab: DashboardTabId) => void;
  posts: LiteraryPost[];
  users: UserProfile[];
  categories: CategoryItem[];
  announcements: AnnouncementItem[];
  notifications: NotificationItem[];
  onOpenEditProfile: () => void;
  onGoogleSignIn: () => void;
  onOpenAuthModal: (mode: 'login' | 'register' | 'admin') => void;
  onLogout: () => void;
  onOpenPost: (post: LiteraryPost) => void;
  onEditDraft: (post: LiteraryPost) => void;
  onDeletePost: (postId: string) => void;
  onApprovePost: (postId: string) => void;
  onRejectPost: (postId: string) => void;
  onReviewPostStatus: (postId: string, status: PostStatus, editorialNotes?: string) => void;
  onUpdatePublishedPost: (
    postId: string,
    updates: Partial<Pick<LiteraryPost, 'title' | 'subtitle' | 'content' | 'language' | 'section'>>
  ) => void;
  onToggleUserBlueTick: (targetUserId: string) => void;
  onToggleUserSuspension: (targetUserId: string, nextStatus: 'active' | 'suspended') => void;
  onCreateCategory: (cat: {
    name: string;
    language: LanguageCode | 'all';
    section: LiterarySection;
    description: string;
  }) => void;
  onToggleCategoryActive: (catId: string, isActive: boolean) => void;
  onDeleteCategory: (catId: string) => void;
  onSendAdminNotification: (payload: {
    targetUserId: string;
    title: string;
    message: string;
  }) => void;
  onCreateAnnouncement: (payload: {
    title: string;
    content: string;
    language: LanguageCode | 'all';
  }) => void;
  onToggleAnnouncement: (annId: string, isActive: boolean) => void;
  onDeleteAnnouncement: (annId: string) => void;
  onUpdateAccountSettings: (updates: {
    preferredLanguage?: LanguageCode;
    emailNotifications?: boolean;
    editorialAlerts?: boolean;
  }) => void;
  onChangePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; message: string }>;
  onNavigateSubmit: () => void;
}

export const DashboardAndAdminView: React.FC<DashboardAndAdminViewProps> = ({
  currentUser,
  authEmail,
  isAuthenticated,
  isGoogleSignedIn,
  activeTab: externalTab,
  onSelectTab,
  posts,
  users,
  categories,
  announcements,
  notifications,
  onOpenEditProfile,
  onGoogleSignIn,
  onOpenAuthModal,
  onLogout,
  onOpenPost,
  onEditDraft,
  onDeletePost,
  onApprovePost,
  onRejectPost,
  onReviewPostStatus,
  onUpdatePublishedPost,
  onToggleUserBlueTick,
  onToggleUserSuspension,
  onCreateCategory,
  onToggleCategoryActive,
  onDeleteCategory,
  onSendAdminNotification,
  onCreateAnnouncement,
  onToggleAnnouncement,
  onDeleteAnnouncement,
  onUpdateAccountSettings,
  onChangePassword,
  onNavigateSubmit
}) => {
  const [internalTab, setInternalTab] = useState<DashboardTabId>('my-profile');
  const currentTab = externalTab || internalTab;

  const setTab = (t: DashboardTabId) => {
    setInternalTab(t);
    if (onSelectTab) onSelectTab(t);
  };

  // Review Notes state per postId
  const [reviewNotesByPost, setReviewNotesByPost] = useState<Record<string, string>>({});
  const [submissionFilter, setSubmissionFilter] = useState<PostStatus | 'all'>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit Published Post Modal State
  const [editingPublishedPost, setEditingPublishedPost] = useState<LiteraryPost | null>(null);
  const [editPubTitle, setEditPubTitle] = useState('');
  const [editPubSubtitle, setEditPubSubtitle] = useState('');
  const [editPubContent, setEditPubContent] = useState('');
  const [editPubLang, setEditPubLang] = useState<LanguageCode>('en');
  const [editPubSec, setEditPubSec] = useState<LiterarySection>('fiction');

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatLang, setNewCatLang] = useState<LanguageCode | 'all'>('en');
  const [newCatSec, setNewCatSec] = useState<LiterarySection>('fiction');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Admin Notification Form State
  const [notifTarget, setNotifTarget] = useState<string>('all');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSentBanner, setNotifSentBanner] = useState('');

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annLang, setAnnLang] = useState<LanguageCode | 'all'>('all');

  // Account Settings & Password State
  const [prefLang, setPrefLang] = useState<LanguageCode>(
    currentUser.preferredLanguage || 'en'
  );
  const [emailNotifs, setEmailNotifs] = useState<boolean>(
    currentUser.emailNotifications ?? true
  );
  const [editorialAlerts, setEditorialAlerts] = useState<boolean>(
    currentUser.editorialAlerts ?? true
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsFeedback, setSettingsFeedback] = useState('');

  // User's own submitted works (plus drafts)
  const mySubmittedWorks = posts.filter((p) => p.authorId === currentUser.uid);

  // Author statistics for published works
  const authorStats = calculateAuthorStats(posts, currentUser.uid, currentUser.followersCount);

  // Admin Overview Statistics
  const adminStats = calculateAdminOverviewStats(users, posts);

  // Strict check: Admin dashboard & console only accessible by mohammedmusthafac3@gmail.com
  const isOfficialChiefEditor = Boolean(
    isAuthenticated &&
    ((authEmail || '').trim().toLowerCase() === CHIEF_EDITOR_EMAIL.toLowerCase() ||
     (currentUser.email || '').trim().toLowerCase() === CHIEF_EDITOR_EMAIL.toLowerCase()) &&
    isAdminRole(currentUser.role)
  );

  const pendingReviewWorks = posts.filter(
    (p) =>
      p.status === 'pending' ||
      p.status === 'under_review' ||
      p.status === 'accepted' ||
      p.status === 'revision_requested'
  );

  const filteredAdminManuscripts = posts.filter((p) => {
    if (p.status === 'draft') return false;
    if (submissionFilter === 'all') return true;
    return p.status === submissionFilter;
  });

  const publishedCatalogWorks = posts.filter((p) => p.status === 'published');

  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  });

  const myNotifications = notifications.filter(
    (n) =>
      n.targetUserId === 'all' ||
      n.targetUserId === currentUser.uid ||
      (isOfficialChiefEditor && n.targetUserId === 'safwa_official_account')
  );

  const handleOpenEditPublished = (post: LiteraryPost) => {
    setEditingPublishedPost(post);
    setEditPubTitle(post.title);
    setEditPubSubtitle(post.subtitle || '');
    setEditPubContent(post.content);
    setEditPubLang(post.language);
    setEditPubSec(post.section);
  };

  const handleSaveEditPublished = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPublishedPost || !editPubTitle.trim() || !editPubContent.trim()) return;
    onUpdatePublishedPost(editingPublishedPost.id, {
      title: editPubTitle.trim(),
      subtitle: editPubSubtitle.trim(),
      content: editPubContent.trim(),
      language: editPubLang,
      section: editPubSec
    });
    setEditingPublishedPost(null);
  };

  const handleCreateCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onCreateCategory({
      name: newCatName.trim(),
      language: newCatLang,
      section: newCatSec,
      description: newCatDesc.trim()
    });
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleSendNotificationForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim()) return;
    onSendAdminNotification({
      targetUserId: notifTarget,
      title: notifTitle.trim(),
      message: notifMessage.trim()
    });
    setNotifTitle('');
    setNotifMessage('');
    setNotifSentBanner('Notification dispatched successfully.');
    setTimeout(() => setNotifSentBanner(''), 4000);
  };

  const handleCreateAnnouncementForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    onCreateAnnouncement({
      title: annTitle.trim(),
      content: annContent.trim(),
      language: annLang
    });
    setAnnTitle('');
    setAnnContent('');
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAccountSettings({
      preferredLanguage: prefLang,
      emailNotifications: emailNotifs,
      editorialAlerts
    });
    setSettingsFeedback('Account preferences saved.');
    setTimeout(() => setSettingsFeedback(''), 3500);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await onChangePassword({
      currentPassword,
      newPassword,
      confirmPassword
    });
    setSettingsFeedback(res.message);
    if (res.success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      {/* Role-Adaptive Navigation Bar with Colourful Glowing Accents */}
      <div className="p-4 rounded-2xl bg-[#0D1426]/90 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)] space-y-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold px-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
              Member Desk:
            </span>
            {(
              [
                { id: 'my-profile', label: 'My Profile', icon: Users },
                { id: 'my-submissions', label: 'My Submissions', icon: FileText },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'settings', label: 'Settings', icon: Settings }
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    currentTab === item.id
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl hover:bg-rose-900/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-bold text-cyan-200 bg-[#121A30] border border-cyan-500/40 rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('register')}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl hover:shadow-[0_0_20px_rgba(217,70,239,0.5)]"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Administrator Navigation Strip (Strictly rendered ONLY for mohammedmusthafac3@gmail.com) */}
        {isOfficialChiefEditor && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-amber-300 font-bold px-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Console:</span>
            </span>
            {(
              [
                { id: 'admin-overview', label: 'Admin Dashboard' },
                { id: 'admin-users', label: 'Users' },
                { id: 'admin-manuscripts', label: 'Manuscript Management' },
                { id: 'admin-publications', label: 'Publications' },
                { id: 'admin-categories', label: 'Categories' },
                { id: 'admin-notifications', label: 'Notifications' }
              ] as const
            ).map((adm) => (
              <button
                key={adm.id}
                type="button"
                onClick={() => setTab(adm.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  currentTab === adm.id
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-300/40'
                    : 'text-amber-200/80 hover:text-amber-100 hover:bg-amber-950/40'
                }`}
              >
                {adm.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section 1: User Account Details Header Card + Statistics Widget (Always visible on My Profile) */}
      {(currentTab === 'my-profile' || currentTab === 'my-submissions') && (
        <section
          aria-label="User Account Details"
          className="p-6 md:p-8 rounded-3xl bg-[#0D1426]/90 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur-xl flex flex-col gap-6 text-slate-100"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative">
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)] shrink-0"
                />
                {currentUser.isVerified && (
                  <span className="absolute -bottom-1 -right-1 bg-[#090E1D] rounded-full p-0.5">
                    <BlueTickBadge size={20} />
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                    {currentUser.name}
                  </h1>
                  <span className="text-xs text-slate-400 font-mono-num">
                    @{currentUser.username}
                  </span>
                </div>

                <p className="text-sm text-slate-300 mt-1.5 max-w-2xl">
                  {currentUser.bio || 'No literary bio added yet.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                  <span>
                    Role:{' '}
                    <strong className={`uppercase ${isOfficialChiefEditor ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-cyan-300'}`}>
                      {isOfficialChiefEditor ? 'ADMIN (Chief Editor)' : 'USER'}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>
                    Blue Tick Status:{' '}
                    <strong className="text-slate-200">
                      {currentUser.isVerified
                        ? 'Verified Official Blue Tick'
                        : 'Standard Account (Awaiting Verification)'}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>
                    Preferred Language:{' '}
                    <strong className="text-slate-200">
                      {formatLanguageLabel(currentUser.preferredLanguage || 'en')}
                    </strong>
                  </span>
                  {(authEmail || currentUser.email) && (
                    <>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-cyan-400 font-mono">{authEmail || currentUser.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenEditProfile}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-200 bg-[#131B33] border border-cyan-500/30 rounded-xl hover:bg-[#1A2547] hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Profile & Photo</span>
              </button>

              {!isGoogleSignedIn && (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all whitespace-nowrap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Small Statistics Widget for Author's Published Works with Neon Glow */}
          <div
            data-testid="author-statistics-widget"
            aria-label="Author Profile Statistics"
            className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800"
          >
            <div className="p-4 rounded-2xl bg-[#090E1D] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold uppercase tracking-wider">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total Reads</span>
              </div>
              <div
                data-testid="stat-total-reads"
                className="text-3xl font-mono-num font-black text-cyan-300 text-glow-cyan mt-2"
              >
                {authorStats.totalReads}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">Across published works</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#090E1D] border border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.2)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-fuchsia-300 font-bold uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Total Likes</span>
              </div>
              <div
                data-testid="stat-total-likes"
                className="text-3xl font-mono-num font-black text-fuchsia-300 text-glow-fuchsia mt-2"
              >
                {authorStats.totalLikes}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">Reader appreciations</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#090E1D] border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.2)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-purple-300 font-bold uppercase tracking-wider">
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span>Followers</span>
              </div>
              <div
                data-testid="stat-total-followers"
                className="text-3xl font-mono-num font-black text-purple-300 mt-2"
              >
                {authorStats.totalFollowers}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">Author community</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#090E1D] border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Published Works</span>
              </div>
              <div
                data-testid="stat-published-count"
                className="text-3xl font-mono-num font-black text-emerald-300 text-glow-emerald mt-2"
              >
                {authorStats.publishedWorksCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5">Live in catalog</span>
            </div>
          </div>
        </section>
      )}

      {/* Section 2: User's Submitted Works & Drafts Portfolio */}
      {(currentTab === 'my-profile' || currentTab === 'my-submissions') && (
        <section aria-label="My Submitted Literary Works">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-2xl font-display font-bold text-white">
                Submitted Works, Drafts & Publication Status
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track all manuscripts submitted or saved as drafts under your account (Draft,
                Pending, Under Review, Accepted, Revision Requested, Rejected, Published).
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateSubmit}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] transition-all whitespace-nowrap"
            >
              Submit New Work
            </button>
          </div>

          {mySubmittedWorks.length === 0 ? (
            <div className="p-8 rounded-3xl bg-[#0D1426]/70 border border-slate-800 text-center text-slate-300">
              <p className="text-base font-display">
                You have not submitted any works under this profile yet.
              </p>
              <button
                type="button"
                onClick={onNavigateSubmit}
                className="mt-3 px-4 py-2 text-xs font-bold text-cyan-300 bg-[#121A30] border border-cyan-500/40 rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
              >
                Go to Submission Desk
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySubmittedWorks.map((work) => (
                <div
                  key={work.id}
                  className="rounded-xl bg-white border border-stone-200/90 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <img
                      src={work.coverUrl}
                      alt={work.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover border-b border-stone-100"
                    />
                    <div className="p-5">
                      <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                        <span>
                          {formatSectionLabel(work.section)} · {formatLanguageLabel(work.language)}
                        </span>
                        <span className="font-mono-num text-emerald-800 font-semibold">
                          {work.aiScore}% AI
                        </span>
                      </div>

                      <h3 className="text-xl font-display font-bold text-stone-900 leading-snug">
                        {work.title}
                      </h3>
                      <p className="text-xs text-stone-600 mt-1">
                        By <strong className="text-stone-900">{work.authorName}</strong>
                      </p>

                      {work.editorialNotes && (
                        <div className="mt-3 p-2.5 rounded-lg bg-[#F3EFE6] border border-stone-200 text-xs text-stone-700">
                          <strong className="text-stone-900 block">Editorial Note:</strong>
                          <span>{work.editorialNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-[#FBF9F5] border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      {work.status === 'published' && (
                        <span className="inline-flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Published</span>
                        </span>
                      )}
                      {work.status === 'accepted' && (
                        <span className="inline-flex items-center gap-1 text-sky-800">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Accepted (Awaiting Publication)</span>
                        </span>
                      )}
                      {work.status === 'under_review' && (
                        <span className="inline-flex items-center gap-1 text-amber-900">
                          <Clock className="w-4 h-4" />
                          <span>Under Review</span>
                        </span>
                      )}
                      {work.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-amber-800">
                          <Clock className="w-4 h-4" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {work.status === 'revision_requested' && (
                        <span className="inline-flex items-center gap-1 text-amber-900">
                          <Edit3 className="w-4 h-4" />
                          <span>Revision Requested</span>
                        </span>
                      )}
                      {work.status === 'draft' && (
                        <span className="inline-flex items-center gap-1 text-stone-600">
                          <FileText className="w-4 h-4" />
                          <span>Draft (Private)</span>
                        </span>
                      )}
                      {work.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 text-rose-800">
                          <XCircle className="w-4 h-4" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(work.status === 'draft' ||
                        work.status === 'pending' ||
                        work.status === 'revision_requested') && (
                        <button
                          type="button"
                          onClick={() => onEditDraft(work)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit / Submit</span>
                        </button>
                      )}

                      {work.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => onOpenPost(work)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-900 hover:text-amber-800"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>
                      )}

                      {work.status !== 'published' && (
                        <button
                          type="button"
                          onClick={() => onDeletePost(work.id)}
                          aria-label={`Delete ${work.title}`}
                          className="p-1 text-stone-400 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* USER TAB: NOTIFICATIONS */}
      {currentTab === 'notifications' && (
        <section
          aria-label="User Notifications"
          className="p-6 md:p-8 rounded-2xl bg-white border border-stone-300 space-y-6"
        >
          <div className="border-b border-stone-200 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold text-stone-900">
                Editorial & Administrator Notifications
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Official alerts from Safwa Publishers administrators and manuscript status updates.
              </p>
            </div>
            <span className="text-xs font-mono-num text-stone-500">
              {myNotifications.length} Notices
            </span>
          </div>

          {myNotifications.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">
              You have no notifications at this time.
            </p>
          ) : (
            <div className="divide-y divide-stone-200">
              {myNotifications.map((n) => (
                <div key={n.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <span className="font-semibold text-amber-900 uppercase tracking-wider">
                        {n.type.replace('_', ' ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>From {n.actorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-stone-900">{n.title}</h3>
                    {n.message && <p className="text-xs text-stone-600">{n.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* USER TAB: ACCOUNT SETTINGS */}
      {currentTab === 'settings' && (
        <section
          aria-label="Account Settings"
          className="p-6 md:p-8 rounded-2xl bg-white border border-stone-300 space-y-8"
        >
          <div className="border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-display font-bold text-stone-900">
              Account & Security Settings
            </h2>
            <p className="text-xs text-stone-600 mt-1">
              Manage your preferred reading/writing language, notification preferences, and account
              password.
            </p>
          </div>

          {settingsFeedback && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-950/10 border border-emerald-800/40 text-xs font-semibold text-emerald-900"
            >
              {settingsFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <form onSubmit={handleSavePreferences} className="space-y-4">
              <h3 className="text-base font-display font-bold text-stone-900">
                01. Language & Notification Preferences
              </h3>

              <div>
                <label
                  htmlFor="settings-pref-language"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Preferred Literary Language
                </label>
                <select
                  id="settings-pref-language"
                  value={prefLang}
                  onChange={(e) => setPrefLang(e.target.value as LanguageCode)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                </select>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <span>Receive editorial review status updates for my submitted manuscripts</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editorialAlerts}
                  onChange={(e) => setEditorialAlerts(e.target.checked)}
                  className="rounded border-stone-300"
                />
                <span>Receive announcements when new trilingual monographs are published</span>
              </label>

              <button
                type="submit"
                className="px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
              >
                Save Preferences
              </button>
            </form>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <h3 className="text-base font-display font-bold text-stone-900">
                02. Change Account Password
              </h3>

              <div>
                <label
                  htmlFor="settings-current-pw"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                >
                  Current Password
                </label>
                <input
                  id="settings-current-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3.5 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="settings-new-pw"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    New Password *
                  </label>
                  <input
                    id="settings-new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full px-3.5 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="settings-confirm-pw"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Confirm New Password *
                  </label>
                  <input
                    id="settings-confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-amber-800 rounded-xl hover:bg-amber-900 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Update Password</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* =====================================================================
          ADMIN DASHBOARD & MANAGEMENT CONSOLE (Protected by ADMIN role)
          ===================================================================== */}
      {isOfficialChiefEditor && (
        <section
          aria-label="Official Safwa Publishers Chief Editor Console"
          className="p-6 md:p-8 rounded-3xl bg-[#0D1426] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] space-y-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-2xl font-display font-extrabold text-white">
                  Official Safwa Publishers — Administrator & Chief Editor Console
                </h2>
                <BlueTickBadge size={18} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Role-verified ADMIN workspace: overview statistics, user account management,
                manuscript review workflow, publications, categories, and notifications.
              </p>
            </div>
          </div>

          {/* ADMIN OVERVIEW KPI GRID (Always shown on Admin Dashboard or My Profile for Admin) */}
          {(currentTab === 'admin-overview' || currentTab === 'my-profile') && (
            <div className="space-y-6">
              <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">01.</span>
                <span>Platform Statistics Overview</span>
              </h3>

              <div
                data-testid="admin-overview-stats"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              >
                <div className="p-4 rounded-xl bg-[#090E1D] border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registered Users</span>
                  <div className="text-2xl font-mono-num font-extrabold text-cyan-300 mt-1">
                    {adminStats.totalUsers}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {adminStats.activeUsers} active · {adminStats.suspendedUsers} suspended
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#090E1D] border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Submissions</span>
                  <div className="text-2xl font-mono-num font-extrabold text-indigo-300 mt-1">
                    {adminStats.totalSubmissions}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    +{adminStats.draftCount} saved drafts
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#090E1D] border border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pending & Review</span>
                  <div className="text-2xl font-mono-num font-extrabold text-amber-300 mt-1">
                    {adminStats.pendingCount + adminStats.underReviewCount}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {adminStats.pendingCount} pending · {adminStats.underReviewCount} in review
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#090E1D] border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Accepted</span>
                  <div className="text-2xl font-mono-num font-extrabold text-sky-300 mt-1">
                    {adminStats.acceptedCount}
                  </div>
                  <span className="text-[11px] text-slate-500">Ready to publish</span>
                </div>

                <div className="p-4 rounded-xl bg-[#090E1D] border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rejected</span>
                  <div className="text-2xl font-mono-num font-extrabold text-rose-300 mt-1">
                    {adminStats.rejectedCount}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {adminStats.revisionRequestedCount} revisions req.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#090E1D] border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Published</span>
                  <div className="text-2xl font-mono-num font-extrabold text-emerald-300 mt-1">
                    {adminStats.publishedCount}
                  </div>
                  <span className="text-[11px] text-slate-500">Live in catalog</span>
                </div>
              </div>

              {/* Website Announcements Manager */}
              <div className="pt-4 border-t border-stone-200 space-y-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-800" />
                  <h4 className="text-base font-display font-bold text-stone-900">
                    Website Announcements Management
                  </h4>
                </div>

                <form
                  onSubmit={handleCreateAnnouncementForm}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-[#F3EFE6] border border-stone-200"
                >
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="Announcement headline *"
                    className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                  />
                  <input
                    type="text"
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Announcement details *"
                    className="md:col-span-2 px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={annLang}
                      onChange={(e) => setAnnLang(e.target.value as LanguageCode | 'all')}
                      aria-label="Announcement language"
                      className="px-2.5 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                    >
                      <option value="all">All</option>
                      <option value="en">EN</option>
                      <option value="ar">AR</option>
                      <option value="ml">ML</option>
                    </select>
                    <button
                      type="submit"
                      className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 whitespace-nowrap"
                    >
                      Post Banner
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3.5 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs">
                          <strong className="text-stone-900">{ann.title}</strong>
                          <span className="text-stone-400">·</span>
                          <span className="text-stone-500">
                            {ann.isActive ? 'Active on Homepage' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">{ann.content}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleAnnouncement(ann.id, !ann.isActive)}
                          className="px-2.5 py-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100"
                        >
                          {ann.isActive ? 'Hide' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAnnouncement(ann.id)}
                          aria-label={`Delete announcement ${ann.title}`}
                          className="p-1.5 text-stone-400 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ADMIN MANUSCRIPT MANAGEMENT & REVIEW QUEUE */}
          {(currentTab === 'admin-manuscripts' ||
            currentTab === 'admin-overview' ||
            currentTab === 'my-profile') && (
            <div className="space-y-4 pt-4 border-t border-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-display font-semibold text-stone-900">
                  02. Incoming Manuscript Submissions & AI Authenticity Review (
                  <span className="font-mono-num">{pendingReviewWorks.length}</span> Active in Queue)
                </h3>

                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE6] rounded-lg border border-stone-200">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'pending', label: 'Pending' },
                      { id: 'under_review', label: 'Under Review' },
                      { id: 'accepted', label: 'Accepted' },
                      { id: 'revision_requested', label: 'Revisions' },
                      { id: 'rejected', label: 'Rejected' },
                      { id: 'published', label: 'Published' }
                    ] as const
                  ).map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSubmissionFilter(st.id)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                        submissionFilter === st.id
                          ? 'bg-stone-900 text-white'
                          : 'text-stone-700 hover:text-stone-950'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {filteredAdminManuscripts.length === 0 ? (
                <p className="text-xs text-stone-500 italic p-4 rounded-xl bg-[#FBF9F5] border border-stone-200">
                  No manuscripts match this filter. Submit a work on the Submit page to test the AI
                  Checker and editorial review workflow.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredAdminManuscripts.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-col gap-4"
                    >
                      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-4 min-w-0">
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-20 h-20 rounded-lg object-cover border border-stone-300 shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                              <span className="font-semibold text-amber-900">
                                Status: {formatSubmissionStatusLabel(item.status)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{formatLanguageLabel(item.language)}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatSectionLabel(item.section)}</span>
                              <span aria-hidden="true">·</span>
                              <span>By {item.authorName}</span>
                            </div>
                            <h4 className="text-lg font-display font-bold text-stone-900">
                              {item.title}
                            </h4>
                            <p className="text-xs text-stone-600 line-clamp-2 max-w-2xl">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2 pt-1 text-xs">
                              <Sparkles className="w-3.5 h-3.5 text-amber-800" />
                              <span className="font-semibold text-stone-900">
                                AI Checker Score:{' '}
                                <strong
                                  className={`font-mono-num ${
                                    item.aiScore >= 60 ? 'text-rose-800' : 'text-emerald-800'
                                  }`}
                                >
                                  {item.aiScore}% AI
                                </strong>
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-stone-500">{item.aiVerdict}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onReviewPostStatus(
                                item.id,
                                'under_review',
                                reviewNotesByPost[item.id]
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 whitespace-nowrap"
                          >
                            Mark Under Review
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onReviewPostStatus(
                                item.id,
                                'accepted',
                                reviewNotesByPost[item.id]
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 border border-sky-300 rounded-lg hover:bg-sky-100 whitespace-nowrap"
                          >
                            Accept
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onReviewPostStatus(
                                item.id,
                                'revision_requested',
                                reviewNotesByPost[item.id] ||
                                  'Please revise and resubmit with expanded literary detail.'
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 whitespace-nowrap"
                          >
                            Request Revisions
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (reviewNotesByPost[item.id]) {
                                onReviewPostStatus(
                                  item.id,
                                  'published',
                                  reviewNotesByPost[item.id]
                                );
                              } else {
                                onApprovePost(item.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 transition-colors whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Accept & Publish</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (reviewNotesByPost[item.id]) {
                                onReviewPostStatus(
                                  item.id,
                                  'rejected',
                                  reviewNotesByPost[item.id]
                                );
                              } else {
                                onRejectPost(item.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-900 bg-rose-100 border border-rose-300 rounded-lg hover:bg-rose-200 transition-colors whitespace-nowrap"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-stone-200/80 flex items-center gap-3">
                        <input
                          type="text"
                          value={reviewNotesByPost[item.id] ?? item.editorialNotes ?? ''}
                          onChange={(e) =>
                            setReviewNotesByPost((prev) => ({
                              ...prev,
                              [item.id]: e.target.value
                            }))
                          }
                          placeholder="Optional editorial feedback or revision notes for the author..."
                          aria-label={`Editorial notes for ${item.title}`}
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg text-stone-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADMIN USERS MANAGEMENT */}
          {(currentTab === 'admin-users' ||
            currentTab === 'admin-overview' ||
            currentTab === 'my-profile') && (
            <div className="pt-6 border-t border-stone-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-display font-semibold text-stone-900">
                  03. Registered Users, Account Suspension & Blue Tick Verification
                </h3>
                <input
                  type="search"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by name, @username, or email..."
                  className="px-3.5 py-1.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900 w-64"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((u) => {
                  const isSuspended = u.accountStatus === 'suspended';
                  return (
                    <div
                      key={u.uid}
                      className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={u.photoUrl}
                          alt={u.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover border border-stone-300 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-stone-900 truncate">
                              {u.name}
                            </span>
                            {u.isVerified && <BlueTickBadge size={15} />}
                            <span className="text-[11px] font-mono-num text-stone-500">
                              ({isAdminRole(u.role) ? 'ADMIN' : 'USER'})
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 truncate">
                            @{u.username} · {u.email || 'Public Profile'} · Status:{' '}
                            <strong
                              className={isSuspended ? 'text-rose-800' : 'text-emerald-800'}
                            >
                              {isSuspended ? 'Suspended' : 'Active'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleUserBlueTick(u.uid)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                            u.isVerified
                              ? 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'
                              : 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{u.isVerified ? 'Blue Tick Active' : 'Grant Blue Tick'}</span>
                        </button>

                        {u.uid !== 'safwa_official_account' && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleUserSuspension(
                                u.uid,
                                isSuspended ? 'active' : 'suspended'
                              )
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <RefreshCw className="w-3 h-3" />
                                <span>Reactivate</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3" />
                                <span>Suspend</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADMIN PUBLICATIONS MANAGEMENT (Edit / Delete Published Content) */}
          {currentTab === 'admin-publications' && (
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <h3 className="text-lg font-display font-semibold text-stone-900">
                04. Published Catalog Management ({publishedCatalogWorks.length} Publications)
              </h3>

              {publishedCatalogWorks.length === 0 ? (
                <p className="text-xs text-stone-500 italic p-4 rounded-xl bg-[#FBF9F5] border border-stone-200">
                  No works are currently published in the live catalog.
                </p>
              ) : (
                <div className="space-y-3">
                  {publishedCatalogWorks.map((pub) => (
                    <div
                      key={pub.id}
                      className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div>
                        <div className="text-xs text-stone-500">
                          {formatLanguageLabel(pub.language)} · {formatSectionLabel(pub.section)} ·{' '}
                          <span className="font-mono-num">{pub.viewsCount} reads</span>
                        </div>
                        <h4 className="text-base font-display font-bold text-stone-900">
                          {pub.title}
                        </h4>
                        <p className="text-xs text-stone-600">By {pub.authorName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPost(pub)}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-100"
                        >
                          Read
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditPublished(pub)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Content</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePost(pub.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-900 bg-rose-50 border border-rose-300 rounded-lg hover:bg-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADMIN CATEGORIES MANAGEMENT */}
          {currentTab === 'admin-categories' && (
            <div className="pt-4 border-t border-stone-200 space-y-6">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-800" />
                <h3 className="text-lg font-display font-semibold text-stone-900">
                  05. Language & Literary Categories Management
                </h3>
              </div>

              <form
                onSubmit={handleCreateCategoryForm}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-xl bg-[#F3EFE6] border border-stone-200"
              >
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category Name *"
                  className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                />
                <select
                  value={newCatLang}
                  onChange={(e) => setNewCatLang(e.target.value as LanguageCode | 'all')}
                  aria-label="Category language"
                  className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="ml">Malayalam (മലയാളം)</option>
                  <option value="all">All Languages</option>
                </select>
                <select
                  value={newCatSec}
                  onChange={(e) => setNewCatSec(e.target.value as LiterarySection)}
                  aria-label="Category section"
                  className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value="fiction">Fiction</option>
                  <option value="poetry">Poetry</option>
                  <option value="non-fiction">Non-Fiction</option>
                </select>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description"
                  className="px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Category</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>
                          {cat.language.toUpperCase()} · {formatSectionLabel(cat.section)}
                        </span>
                        <span
                          className={
                            cat.isActive
                              ? 'text-emerald-800 font-semibold'
                              : 'text-stone-400'
                          }
                        >
                          {cat.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <h4 className="text-sm font-display font-bold text-stone-900 mt-1">
                        {cat.name}
                      </h4>
                      <p className="text-xs text-stone-600 mt-1">{cat.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/70">
                      <button
                        type="button"
                        onClick={() => onToggleCategoryActive(cat.id, !cat.isActive)}
                        className="text-xs font-semibold text-stone-700 hover:text-stone-950"
                      >
                        {cat.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        aria-label={`Delete category ${cat.name}`}
                        className="text-xs text-rose-800 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADMIN NOTIFICATIONS DISPATCHER */}
          {currentTab === 'admin-notifications' && (
            <div className="pt-4 border-t border-stone-200 space-y-5">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-800" />
                <h3 className="text-lg font-display font-semibold text-stone-900">
                  06. Dispatch Notifications to Individual Users or All Members
                </h3>
              </div>

              {notifSentBanner && (
                <div
                  role="status"
                  className="p-3.5 rounded-xl bg-emerald-950/10 border border-emerald-800/40 text-xs font-semibold text-emerald-900"
                >
                  {notifSentBanner}
                </div>
              )}

              <form
                onSubmit={handleSendNotificationForm}
                className="p-5 rounded-xl bg-[#F3EFE6] border border-stone-200 space-y-4 max-w-2xl"
              >
                <div>
                  <label
                    htmlFor="admin-notif-recipient"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Recipient *
                  </label>
                  <select
                    id="admin-notif-recipient"
                    value={notifTarget}
                    onChange={(e) => setNotifTarget(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                  >
                    <option value="all">Broadcast to All Registered Users</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.name} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-notif-title"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Notification Subject / Title *
                  </label>
                  <input
                    id="admin-notif-title"
                    type="text"
                    value={notifTitle}
                    onChange={(e) => setNotifTitle(e.target.value)}
                    placeholder="e.g., Editorial Call for Autumn Arabic Poetry Monograph"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-notif-message"
                    className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
                  >
                    Detailed Message
                  </label>
                  <textarea
                    id="admin-notif-message"
                    rows={3}
                    value={notifMessage}
                    onChange={(e) => setNotifMessage(e.target.value)}
                    placeholder="Write the official message for the recipient..."
                    className="w-full p-3 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Official Notification</span>
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* Modal for Editing Published Content (Admin Only) */}
      {editingPublishedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Published Work"
          className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl bg-[#FBF9F5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#F3EFE6] border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-stone-900">
                Edit Published Work: {editingPublishedPost.title}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPublishedPost(null)}
                className="text-xs text-stone-500 hover:text-stone-900"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEditPublished} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Language
                  </label>
                  <select
                    value={editPubLang}
                    onChange={(e) => setEditPubLang(e.target.value as LanguageCode)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="en">English</option>
                    <option value="ar">Arabic</option>
                    <option value="ml">Malayalam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Section
                  </label>
                  <select
                    value={editPubSec}
                    onChange={(e) => setEditPubSec(e.target.value as LiterarySection)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg"
                  >
                    <option value="fiction">Fiction</option>
                    <option value="poetry">Poetry</option>
                    <option value="non-fiction">Non-Fiction</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editPubTitle}
                  onChange={(e) => setEditPubTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={editPubSubtitle}
                  onChange={(e) => setEditPubSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Manuscript Text *
                </label>
                <textarea
                  rows={6}
                  value={editPubContent}
                  onChange={(e) => setEditPubContent(e.target.value)}
                  className="w-full p-3 text-sm font-prose bg-white border border-stone-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPublishedPost(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
