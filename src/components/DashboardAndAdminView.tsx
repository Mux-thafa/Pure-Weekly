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
  Eye,
  Heart,
  Users
} from 'lucide-react';
import {
  CHIEF_EDITOR_EMAIL,
  calculateAuthorStats,
  type LiteraryPost,
  type UserProfile
} from '../utils/editorialLogic';
import { formatLanguageLabel, formatSectionLabel } from '../data/seedCatalog';
import { BlueTickBadge } from './BlueTickBadge';

interface DashboardAndAdminViewProps {
  currentUser: UserProfile;
  authEmail: string | null;
  isGoogleSignedIn: boolean;
  posts: LiteraryPost[];
  users: UserProfile[];
  onOpenEditProfile: () => void;
  onGoogleSignIn: () => void;
  onOpenPost: (post: LiteraryPost) => void;
  onApprovePost: (postId: string) => void;
  onRejectPost: (postId: string) => void;
  onToggleUserBlueTick: (targetUserId: string) => void;
  onNavigateSubmit: () => void;
}

export const DashboardAndAdminView: React.FC<DashboardAndAdminViewProps> = ({
  currentUser,
  authEmail,
  isGoogleSignedIn,
  posts,
  users,
  onOpenEditProfile,
  onGoogleSignIn,
  onOpenPost,
  onApprovePost,
  onRejectPost,
  onToggleUserBlueTick,
  onNavigateSubmit
}) => {
  // User's own submitted works (plus any pending works submitted in this session)
  const mySubmittedWorks = posts.filter((p) => p.authorId === currentUser.uid);

  // Author statistics for published works
  const authorStats = calculateAuthorStats(posts, currentUser.uid, currentUser.followersCount);

  // Pending works for Chief Editor Review Queue
  const pendingReviewWorks = posts.filter((p) => p.status === 'pending');

  const isOfficialChiefEditor =
    authEmail === CHIEF_EDITOR_EMAIL || currentUser.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
      {/* Section 1: User Account Details Header Card */}
      <section
        aria-label="User Account Details"
        className="p-6 md:p-8 rounded-2xl bg-[#F3EFE6] border border-stone-300 flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <img
              src={currentUser.photoUrl}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-20 h-20 rounded-full object-cover border-2 border-amber-800/50 shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-900">
                  {currentUser.name}
                </h1>
                {currentUser.isVerified && <BlueTickBadge size={20} />}
                <span className="text-xs text-stone-600 font-mono-num">
                  @{currentUser.username}
                </span>
              </div>

              <p className="text-sm text-stone-700 mt-1.5 max-w-2xl">
                {currentUser.bio || 'No literary bio added yet.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 mt-3">
                <span>
                  Role:{' '}
                  <strong className="text-stone-900 capitalize">{currentUser.role}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Blue Tick Status:{' '}
                  <strong className="text-stone-900">
                    {currentUser.isVerified
                      ? 'Verified Official Blue Tick'
                      : 'Standard Account (Awaiting Official Blue Tick)'}
                  </strong>
                </span>
                {authEmail && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Signed in as {authEmail}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onOpenEditProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-900 bg-[#FBF9F5] border border-stone-300 rounded-xl hover:bg-stone-200/70 transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile & Photo</span>
            </button>

            {!isGoogleSignedIn && (
              <button
                type="button"
                onClick={onGoogleSignIn}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Small Statistics Widget for Author's Published Works */}
        <div
          data-testid="author-statistics-widget"
          aria-label="Author Profile Statistics"
          className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-stone-300/80"
        >
          <div className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
              <Eye className="w-3.5 h-3.5 text-amber-800" />
              <span>Total Reads</span>
            </div>
            <div
              data-testid="stat-total-reads"
              className="text-2xl font-mono-num font-bold text-stone-900 mt-2"
            >
              {authorStats.totalReads}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5">Across published works</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
              <Heart className="w-3.5 h-3.5 text-rose-800" />
              <span>Total Likes</span>
            </div>
            <div
              data-testid="stat-total-likes"
              className="text-2xl font-mono-num font-bold text-stone-900 mt-2"
            >
              {authorStats.totalLikes}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5">Reader appreciations</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
              <Users className="w-3.5 h-3.5 text-sky-800" />
              <span>Followers</span>
            </div>
            <div
              data-testid="stat-total-followers"
              className="text-2xl font-mono-num font-bold text-stone-900 mt-2"
            >
              {authorStats.totalFollowers}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5">Author community</span>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200/90 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-emerald-800" />
              <span>Published Works</span>
            </div>
            <div
              data-testid="stat-published-count"
              className="text-2xl font-mono-num font-bold text-stone-900 mt-2"
            >
              {authorStats.publishedWorksCount}
            </div>
            <span className="text-[11px] text-stone-500 mt-0.5">Live in catalog</span>
          </div>
        </div>
      </section>

      {/* Section 2: User's Submitted Works Portfolio (Cover Image, Title, Author Name, Published or Not) */}
      <section aria-label="My Submitted Literary Works">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-stone-200">
          <div>
            <h2 className="text-2xl font-display font-bold text-stone-900">
              Submitted Works & Publication Status
            </h2>
            <p className="text-xs text-stone-600 mt-0.5">
              Showing all manuscripts submitted by your account with their cover image, title,
              author name, and whether they are published or pending review.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateSubmit}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors whitespace-nowrap"
          >
            Submit New Work
          </button>
        </div>

        {mySubmittedWorks.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center">
            <p className="text-base font-display text-stone-700">
              You have not submitted any works under this profile yet.
            </p>
            <button
              type="button"
              onClick={onNavigateSubmit}
              className="mt-3 px-4 py-2 text-xs font-semibold text-stone-900 bg-[#F3EFE6] border border-stone-300 rounded-lg hover:bg-stone-200 transition-colors"
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
                  </div>
                </div>

                <div className="px-5 py-3.5 bg-[#FBF9F5] border-t border-stone-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {work.status === 'published' && (
                      <span className="inline-flex items-center gap-1 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Published</span>
                      </span>
                    )}
                    {work.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <Clock className="w-4 h-4" />
                        <span>Not Published (Pending Review)</span>
                      </span>
                    )}
                    {work.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 text-rose-800">
                        <XCircle className="w-4 h-4" />
                        <span>Not Published (Declined)</span>
                      </span>
                    )}
                  </div>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 3: Official Safwa Publishers Chief Editor Console (Accept/Reject & Blue Tick Granting) */}
      <section
        aria-label="Official Safwa Publishers Chief Editor Console"
        className="p-6 md:p-8 rounded-2xl bg-white border border-stone-300 space-y-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-800" />
              <h2 className="text-2xl font-display font-bold text-stone-900">
                Official Safwa Publishers — Chief Editor Desk
              </h2>
              <BlueTickBadge size={18} />
            </div>
            <p className="text-xs text-stone-600 mt-1">
              All incoming manuscripts (with automatic AI percentage reports) and new account
              registrations arrive here so you can Accept or Reject works and grant the real Blue
              Tick badge.
              {isOfficialChiefEditor ? ' (Chief Editor Active)' : ''}
            </p>
          </div>
        </div>

        {/* 3A: Manuscript Review Queue with AI Checker Percentage */}
        <div>
          <h3 className="text-lg font-display font-semibold text-stone-900 mb-4">
            01. Incoming Manuscript Submissions & AI Authenticity Reports (
            <span className="font-mono-num">{pendingReviewWorks.length}</span> Pending)
          </h3>

          {pendingReviewWorks.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-4 rounded-xl bg-[#FBF9F5] border border-stone-200">
              All submitted manuscripts have been reviewed. Submit a new work on the Submit page to
              test the AI Checker and approval workflow.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingReviewWorks.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-[#FBF9F5] border border-stone-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover border border-stone-300 shrink-0"
                    />
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
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

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => onApprovePost(item.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 rounded-lg hover:bg-emerald-900 transition-colors whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept & Publish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectPost(item.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-900 bg-rose-100 border border-rose-300 rounded-lg hover:bg-rose-200 transition-colors whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3B: Registered Author Accounts & Blue Tick Verification Control */}
        <div className="pt-6 border-t border-stone-200">
          <h3 className="text-lg font-display font-semibold text-stone-900 mb-4">
            02. Registered Accounts & Official Blue Tick Assignment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <div
                key={u.uid}
                className="p-4 rounded-xl bg-[#FBF9F5] border border-stone-200 flex items-center justify-between gap-4"
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
                    </div>
                    <p className="text-xs text-stone-500 truncate">
                      @{u.username} · {u.bio || 'Literary contributor'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleUserBlueTick(u.uid)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    u.isVerified
                      ? 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'
                      : 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{u.isVerified ? 'Blue Tick Active' : 'Grant Blue Tick'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
