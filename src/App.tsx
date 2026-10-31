/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Eye,
  Heart,
  MessageSquare,
  PenTool,
  Sparkles,
  UserPlus,
  LogIn,
  LogOut
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from './firebase';
import {
  CHIEF_EDITOR_EMAIL,
  filterPublishedPosts,
  incrementPostViewCount,
  sanitizePostPayload,
  sanitizeUserProfilePayload,
  type DirectMessage,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type NotificationItem,
  type PostComment,
  type StoryItem,
  type UserProfile
} from './utils/editorialLogic';
import {
  formatLanguageLabel,
  formatSectionLabel,
  makeAvatarSvg,
  SEED_COMMENTS,
  SEED_MESSAGES,
  SEED_NOTIFICATIONS,
  SEED_POSTS,
  SEED_STORIES,
  SEED_USERS,
  UI_TRANSLATIONS
} from './data/seedCatalog';
import { BlueTickBadge } from './components/BlueTickBadge';
import { StoryCarouselAndModal } from './components/StoryCarouselAndModal';
import { ArticleReaderModal } from './components/ArticleReaderModal';
import { SubmitWorkView } from './components/SubmitWorkView';
import { DirectMessagesModal } from './components/DirectMessagesModal';
import { OnboardingModal } from './components/OnboardingModal';
import { DashboardAndAdminView } from './components/DashboardAndAdminView';
import { AboutView } from './components/AboutView';

type ActivePage = 'home' | 'submit' | 'about' | 'dashboard';

export default function App() {
  // Navigation & Language State
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  const [languageFilterAll, setLanguageFilterAll] = useState<boolean>(true);
  const [activeSectionFilter, setActiveSectionFilter] = useState<LiterarySection | 'all'>('all');

  // Pre-selected options when clicking from hover menu on Submit
  const [submitDefaultLang, setSubmitDefaultLang] = useState<LanguageCode>('en');
  const [submitDefaultSection, setSubmitDefaultSection] = useState<LiterarySection>('fiction');

  // Hover dropdown states (works for both pointer hover & click/keyboard)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSubmitMenuOpen, setIsSubmitMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  // Core Application Data (Initialized with rich trilingual seed catalog + synced with Firestore)
  const [users, setUsers] = useState<UserProfile[]>(SEED_USERS);
  const [posts, setPosts] = useState<LiteraryPost[]>(SEED_POSTS);
  const [stories, setStories] = useState<StoryItem[]>(SEED_STORIES);
  const [commentsByPost, setCommentsByPost] =
    useState<Record<string, PostComment[]>>(SEED_COMMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [messages, setMessages] = useState<DirectMessage[]>(SEED_MESSAGES);

  // User Auth & Profile State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(SEED_USERS[0]);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Record<string, boolean>>({});

  // Modals State
  const [readingPostId, setReadingPostId] = useState<string | null>(null);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isNewAccountFlow, setIsNewAccountFlow] = useState(false);

  // Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);

      if (fbUser) {
        const isMainAdmin = fbUser.email === CHIEF_EDITOR_EMAIL;
        const cleanUid = fbUser.uid.replace(/[^a-zA-Z0-9_\-]/g, '_');
        setUsers((prevUsers) => {
          const existing = prevUsers.find((u) => u.uid === cleanUid);
          if (existing) {
            setCurrentUser(existing);
            return prevUsers;
          }
          const newProfile: UserProfile = sanitizeUserProfilePayload({
            uid: cleanUid,
            name: fbUser.displayName || 'Safwa Author',
            username: (fbUser.email?.split('@')[0] || 'author').replace(/[^a-zA-Z0-9_\-.]/g, ''),
            bio: isMainAdmin
              ? 'Chief Editor & Main Official Account of Safwa Publishers.'
              : 'Literary contributor on Safwa Publishers.',
            photoUrl:
              fbUser.photoURL ||
              makeAvatarSvg((fbUser.displayName || 'SA').slice(0, 2), '#1E3A8A', '#FBF9F5'),
            isVerified: isMainAdmin,
            role: isMainAdmin ? 'admin' : 'author',
            visibility: 'public',
            followersCount: 0,
            followingCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setCurrentUser(newProfile);
          setIsNewAccountFlow(true);
          setIsOnboardingOpen(true);
          return [newProfile, ...prevUsers];
        });
      }
    });
    return () => unsub();
  }, []);

  // Firestore Real-Time Listeners (Guarded by authReady)
  useEffect(() => {
    if (!authReady) return;

    const publishedPostsQuery = query(
      collection(db, 'posts'),
      where('status', '==', 'published')
    );
    const unsubPosts = onSnapshot(
      publishedPostsQuery,
      (snap) => {
        if (snap.empty) return;
        const remotePosts: LiteraryPost[] = [];
        snap.forEach((docSnap) => {
          remotePosts.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<LiteraryPost, 'id'>)
          });
        });
        setPosts((prev) => {
          const map = new Map<string, LiteraryPost>();
          prev.forEach((p) => map.set(p.id, p));
          remotePosts.forEach((p) => map.set(p.id, p));
          return Array.from(map.values());
        });
      },
      (err) => {
        // Only invoke structured error handler if signed in
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.LIST, 'posts');
        }
      }
    );

    const publicStoriesQuery = query(
      collection(db, 'stories'),
      where('visibility', '==', 'public')
    );
    const unsubStories = onSnapshot(
      publicStoriesQuery,
      (snap) => {
        if (snap.empty) return;
        const remoteStories: StoryItem[] = [];
        snap.forEach((docSnap) => {
          remoteStories.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<StoryItem, 'id'>)
          });
        });
        setStories((prev) => {
          const map = new Map<string, StoryItem>();
          prev.forEach((s) => map.set(s.id, s));
          remoteStories.forEach((s) => map.set(s.id, s));
          return Array.from(map.values());
        });
      },
      (err) => {
        if (auth.currentUser) {
          handleFirestoreError(err, OperationType.LIST, 'stories');
        }
      }
    );

    return () => {
      unsubPosts();
      unsubStories();
    };
  }, [authReady]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (_error) {
      // If popup is blocked in headless preview or closed by user, open profile onboarding modal
      setIsNewAccountFlow(true);
      setIsOnboardingOpen(true);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(SEED_USERS[0]);
    } catch (_err) {
      // Ignore sign-out errors
    }
  };

  // Language switcher: switches entire page UI and filters content to that language
  const handleSelectLanguage = (lang: LanguageCode | 'all') => {
    setIsLangMenuOpen(false);
    if (lang === 'all') {
      setLanguageFilterAll(true);
      setActiveLanguage('en');
    } else {
      setLanguageFilterAll(false);
      setActiveLanguage(lang);
      setSubmitDefaultLang(lang);
    }
    setActivePage('home');
  };

  // Open full post and increment view count (1st time -> +1, 2nd time -> +2)
  const handleOpenPost = async (post: LiteraryPost) => {
    const updated = incrementPostViewCount(post);
    setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
    setReadingPostId(post.id);

    if (firebaseUser) {
      try {
        const sanitized = sanitizePostPayload(updated);
        await updateDoc(doc(db, 'posts', post.id), {
          viewsCount: sanitized.viewsCount,
          updatedAt: sanitized.updatedAt
        });
      } catch (_err) {
        // Local state already updated for instant UX
      }
    }
  };

  const handleOpenPostById = (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (target) {
      handleOpenPost(target);
    }
  };

  // Toggle Like on a Post
  const handleToggleLike = (postId: string) => {
    const alreadyLiked = Boolean(likedPostIds[postId]);
    setLikedPostIds((prev) => ({ ...prev, [postId]: !alreadyLiked }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likesCount: Math.max(0, p.likesCount + (alreadyLiked ? -1 : 1)) }
          : p
      )
    );
  };

  // Add Comment to a Post
  const handleAddComment = async (postId: string, text: string) => {
    const newComment: PostComment = {
      id: `comm_${Date.now()}`,
      postId,
      authorId: currentUser.uid,
      authorName: currentUser.name,
      authorPhoto: currentUser.photoUrl,
      authorVerified: currentUser.isVerified,
      text: text.slice(0, 2000),
      visibility: 'public',
      createdAt: new Date().toISOString()
    };

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [newComment, ...(prev[postId] || [])]
    }));

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
      )
    );

    if (firebaseUser) {
      try {
        const { id, ...commentData } = newComment;
        await setDoc(doc(db, 'posts', postId, 'comments', id), commentData);
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Share Post to Home Page Story Reel with Custom Duration
  const handleShareToStory = async (post: LiteraryPost, durationSeconds: number) => {
    const newStory: StoryItem = {
      id: `story_${Date.now()}`,
      postId: post.id,
      postTitle: post.title,
      postSection: post.section,
      postLanguage: post.language,
      excerpt: `"${post.content.slice(0, 220).trim()}..."`,
      coverUrl: post.coverUrl,
      authorId: currentUser.uid,
      authorName: currentUser.name,
      authorPhoto: currentUser.photoUrl,
      authorVerified: currentUser.isVerified,
      durationSeconds,
      visibility: 'public',
      createdAt: new Date().toISOString()
    };

    setStories((prev) => [newStory, ...prev]);

    if (firebaseUser) {
      try {
        const { id, ...storyData } = newStory;
        await setDoc(doc(db, 'stories', id), storyData);
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Follow / Unfollow Author
  const handleToggleFollow = (authorId: string) => {
    const isCurrentlyFollowing = Boolean(followedAuthorIds[authorId]);
    setFollowedAuthorIds((prev) => ({ ...prev, [authorId]: !isCurrentlyFollowing }));
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === authorId
          ? {
              ...u,
              followersCount: Math.max(
                0,
                u.followersCount + (isCurrentlyFollowing ? -1 : 1)
              )
            }
          : u
      )
    );
  };

  // Submit New Literary Work -> Sent to Official Account Queue
  const handleSubmitWork = async (rawPost: Omit<LiteraryPost, 'id'>) => {
    const sanitized = sanitizePostPayload(rawPost);
    const postId = `post_${Date.now()}`;
    const newPost: LiteraryPost = {
      id: postId,
      ...sanitized
    };

    setPosts((prev) => [newPost, ...prev]);

    // Notify the Chief Editor / Main Account
    const adminNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      targetUserId: 'safwa_official_account',
      actorId: currentUser.uid,
      actorName: sanitized.authorName,
      type: 'submission',
      title: `New Submission (${sanitized.aiScore}% AI): "${sanitized.title}" by ${sanitized.authorName}`,
      postId,
      createdAt: new Date().toISOString()
    };
    setNotifications((prev) => [adminNotif, ...prev]);

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'posts', postId), sanitized);
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Chief Editor Accepts & Publishes a Pending Submission
  const handleApprovePost = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'published', updatedAt: now } : p))
    );

    const pubNotif: NotificationItem = {
      id: `notif_${Date.now()}`,
      targetUserId: 'all',
      actorId: currentUser.uid,
      actorName: target.authorName,
      type: 'published',
      title: `New Published Work: "${target.title}" by ${target.authorName}`,
      postId: target.id,
      createdAt: now
    };
    setNotifications((prev) => [pubNotif, ...prev]);

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          status: 'published',
          updatedAt: now
        });
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Chief Editor Rejects a Pending Submission
  const handleRejectPost = async (postId: string) => {
    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: 'rejected', updatedAt: now } : p))
    );

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          status: 'rejected',
          updatedAt: now
        });
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Chief Editor Grants or Revokes Real Blue Tick
  const handleToggleUserBlueTick = (targetUserId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.uid !== targetUserId) return u;
        const updated = { ...u, isVerified: !u.isVerified };
        if (currentUser.uid === targetUserId) {
          setCurrentUser(updated);
        }
        return updated;
      })
    );

    setPosts((prev) =>
      prev.map((p) =>
        p.authorId === targetUserId ? { ...p, authorVerified: !p.authorVerified } : p
      )
    );
  };

  // Save User Profile & Dispatch New Account Details to Main Official Account
  const handleSaveProfile = async (updated: UserProfile, isNewRegistration: boolean) => {
    const sanitized = sanitizeUserProfilePayload(updated);
    setCurrentUser(sanitized);
    setUsers((prev) => {
      const exists = prev.some((u) => u.uid === sanitized.uid);
      if (exists) {
        return prev.map((u) => (u.uid === sanitized.uid ? sanitized : u));
      }
      return [sanitized, ...prev];
    });

    if (isNewRegistration) {
      const acctNotif: NotificationItem = {
        id: `notif_acct_${Date.now()}`,
        targetUserId: 'safwa_official_account',
        actorId: sanitized.uid,
        actorName: sanitized.name,
        type: 'new_account',
        title: `New Account Registered: ${sanitized.name} (@${sanitized.username}) — Ready for Blue Tick Review`,
        postId: '',
        createdAt: new Date().toISOString()
      };
      setNotifications((prev) => [acctNotif, ...prev]);
    }

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'users', sanitized.uid), sanitized);
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Send Direct Message
  const handleSendDirectMessage = async (receiver: UserProfile, text: string) => {
    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.uid,
      senderName: currentUser.name,
      senderPhoto: currentUser.photoUrl,
      receiverId: receiver.uid,
      receiverName: receiver.name,
      receiverPhoto: receiver.photoUrl,
      text: text.slice(0, 2000),
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newMsg]);

    if (firebaseUser) {
      try {
        const { id, ...msgData } = newMsg;
        await setDoc(doc(db, 'messages', id), msgData);
      } catch (_err) {
        // Local state updated
      }
    }
  };

  const t = UI_TRANSLATIONS[activeLanguage] || UI_TRANSLATIONS.en;
  const isPageRtl = !languageFilterAll && activeLanguage === 'ar';

  const visiblePosts = filterPublishedPosts(posts, {
    language: languageFilterAll ? 'all' : activeLanguage,
    section: activeSectionFilter
  });

  const latestArticles = visiblePosts.filter((p) => p.section === 'non-fiction');
  const trendingPoems = visiblePosts.filter((p) => p.section === 'poetry');
  const weeksFiction = visiblePosts.filter((p) => p.section === 'fiction');

  const activeReadingPost = readingPostId
    ? posts.find((p) => p.id === readingPostId) || null
    : null;

  const publishedNotifications = notifications.filter(
    (n) => n.type === 'published' || n.type === 'submission' || n.type === 'new_account'
  );

  return (
    <div
      dir={isPageRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900"
    >
      {/* Top Utility Bar Above Menu Bar: Notification Icon + User Profile Picture Icon -> Opens Dashboard */}
      <div
        dir="ltr"
        className="bg-[#F3EFE6] border-b border-stone-200/90 px-6 py-2 text-xs text-stone-700"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display italic text-stone-700">
              Safwa Publishers · Trilingual Literary Archive (Arabic · Malayalam · English)
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Direct Messages Quick Button */}
            <button
              type="button"
              onClick={() => {
                setMessageRecipientId(null);
                setIsMessagesOpen(true);
              }}
              aria-label="Open Direct Messages"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-950 transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-800" />
              <span>{t.navMessages}</span>
            </button>

            {/* Notification Bell Icon Above Menu Bar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifDropdownOpen((o) => !o)}
                aria-label="Notifications for newly published submissions"
                aria-expanded={isNotifDropdownOpen}
                className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FBF9F5] border border-stone-300 text-stone-800 hover:bg-stone-200/70 transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-800" />
                <span>Notifications</span>
                <span className="font-mono-num font-bold text-amber-900">
                  ({publishedNotifications.length})
                </span>
              </button>

              {isNotifDropdownOpen && (
                <div
                  role="region"
                  aria-label="Published Submissions Notifications"
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FBF9F5] border border-stone-300 rounded-xl shadow-xl z-40 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-[#F3EFE6] border-b border-stone-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-900">
                      Published Works & Editorial Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNotifDropdownOpen(false)}
                      className="text-[11px] text-stone-500 hover:text-stone-900"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-stone-200/70">
                    {publishedNotifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          setIsNotifDropdownOpen(false);
                          if (notif.postId) {
                            handleOpenPostById(notif.postId);
                          } else {
                            setActivePage('dashboard');
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-stone-200/50 transition-colors block"
                      >
                        <p className="text-xs font-semibold text-stone-900 leading-snug">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-stone-500 font-mono-num mt-1 block">
                          By {notif.actorName} ·{' '}
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Google Sign-In / Sign-Out Button */}
            {firebaseUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-300 text-xs font-semibold text-stone-900 hover:bg-stone-100 whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-800" />
                <span>Google Sign In</span>
              </button>
            )}

            {/* Right-Side User Profile Picture Icon -> Clicking Opens Dashboard */}
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              aria-label="Open User Dashboard"
              className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#FBF9F5] border border-stone-300 hover:border-amber-800 transition-colors"
            >
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover"
              />
              <span className="text-xs font-semibold text-stone-900 truncate max-w-[110px]">
                {currentUser.name}
              </span>
              {currentUser.isVerified && <BlueTickBadge size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Bar (Strict 3-Zone Contract: Brand Wordmark — 4 Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-xs border-b border-stone-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActivePage('home');
            }}
            className="text-2xl font-display font-bold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            {t.brandTitle}
          </a>

          {/* Zone 2: 4 Concise Nav Links (Home, Languages [Hover Dropdown], Submit [Hover Dropdown], About) */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-6 text-sm font-medium text-stone-700"
          >
            <button
              type="button"
              onClick={() => {
                setActivePage('home');
                setActiveSectionFilter('all');
              }}
              className={`hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'home' ? 'text-amber-900 font-semibold underline underline-offset-8' : ''
              }`}
            >
              {t.navHome}
            </button>

            {/* Languages Hover & Click Dropdown: Arabic, Malayalam, English */}
            <div
              className="relative"
              onMouseEnter={() => setIsLangMenuOpen(true)}
              onMouseLeave={() => setIsLangMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(true)}
                aria-expanded={isLangMenuOpen}
                className="inline-flex items-center gap-1 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 py-1"
              >
                <span>{t.navLanguages}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isLangMenuOpen && (
                <div
                  role="menu"
                  aria-label="Select Language Edition"
                  className="absolute left-0 top-full pt-1 w-52 z-40"
                >
                  <div className="bg-[#FBF9F5] border border-stone-300 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('ar')}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] flex items-center justify-between"
                    >
                      <span>Arabic</span>
                      <span className="font-display text-sm">العربية</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('ml')}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] flex items-center justify-between"
                    >
                      <span>Malayalam</span>
                      <span className="text-xs">മലയാളം</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('en')}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6] flex items-center justify-between"
                    >
                      <span>English</span>
                      <span className="text-[11px] text-stone-500">EN</span>
                    </button>
                    <div className="border-t border-stone-200 mt-1 pt-1">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelectLanguage('all')}
                        className="w-full px-4 py-2 text-left text-xs text-stone-600 hover:bg-[#F3EFE6]"
                      >
                        {t.allLanguagesLabel}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Hover & Click Dropdown: Fiction, Poetry, Non-Fiction */}
            <div
              className="relative"
              onMouseEnter={() => setIsSubmitMenuOpen(true)}
              onMouseLeave={() => setIsSubmitMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setActivePage('submit');
                  setIsSubmitMenuOpen(false);
                }}
                aria-expanded={isSubmitMenuOpen}
                className={`inline-flex items-center gap-1 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  activePage === 'submit'
                    ? 'text-amber-900 font-semibold underline underline-offset-8'
                    : ''
                }`}
              >
                <span>{t.navSubmit}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isSubmitMenuOpen && (
                <div
                  role="menu"
                  aria-label="Submit by Literary Section"
                  className="absolute left-0 top-full pt-1 w-48 z-40"
                >
                  <div className="bg-[#FBF9F5] border border-stone-300 rounded-xl shadow-xl py-1.5 overflow-hidden">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSubmitDefaultSection('fiction');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6]"
                    >
                      {t.secFiction}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSubmitDefaultSection('poetry');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6]"
                    >
                      {t.secPoetry}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSubmitDefaultSection('non-fiction');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold text-stone-800 hover:bg-[#F3EFE6]"
                    >
                      {t.secNonFiction}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActivePage('about')}
              className={`hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'about' ? 'text-amber-900 font-semibold underline underline-offset-8' : ''
              }`}
            >
              {t.navAbout}
            </button>

            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className={`hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'dashboard'
                  ? 'text-amber-900 font-semibold underline underline-offset-8'
                  : ''
              }`}
            >
              {t.navDashboard}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActivePage('submit')}
              className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0"
            >
              {t.writeOnSafwaTitle}
            </button>
          </div>
        </div>
      </header>

      {/* Stories Strip: Strictly Rendered ONLY on the Home Page ("stories only seen in home page not to another place") */}
      {activePage === 'home' && (
        <StoryCarouselAndModal
          stories={stories}
          activeLanguage={activeLanguage}
          onOpenPostById={handleOpenPostById}
        />
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {activePage === 'home' && (
          <div className="max-w-7xl mx-auto px-6 py-10 space-y-14">
            {/* Hero Split + Overscaling "Write on Safwa Publishers" Box */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Lead Literary Feature (7 columns) */}
              <div className="lg:col-span-7 flex flex-col justify-between p-8 rounded-2xl bg-[#F3EFE6] border border-stone-200/90">
                <div>
                  <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold uppercase tracking-widest mb-3">
                    <span>Safwa Quarterly Monograph</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {languageFilterAll
                        ? t.allLanguagesLabel
                        : formatLanguageLabel(activeLanguage)}
                    </span>
                  </div>

                  <h1
                    className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-stone-900 leading-tight"
                    style={{ textWrap: 'balance' }}
                  >
                    {visiblePosts[0]?.title || t.brandTitle}
                  </h1>

                  <p className="text-base font-prose text-stone-700 mt-4 leading-relaxed line-clamp-3">
                    {visiblePosts[0]?.subtitle ||
                      'Curated Arabic, Malayalam, and English Fiction, Poetry, and Non-Fiction verified for authentic human authorship.'}
                  </p>
                </div>

                {visiblePosts[0] ? (
                  <div className="pt-6 mt-6 border-t border-stone-300/70 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={visiblePosts[0].authorPhoto}
                        alt={visiblePosts[0].authorName}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover border border-stone-300"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-stone-900">
                            {visiblePosts[0].authorName}
                          </span>
                          {visiblePosts[0].authorVerified && <BlueTickBadge size={14} />}
                        </div>
                        <span className="text-[11px] text-stone-500 font-mono-num">
                          {visiblePosts[0].viewsCount} {t.viewsLabel} · {visiblePosts[0].aiScore}% AI
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPost(visiblePosts[0])}
                      className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap"
                    >
                      {t.readFullArticle}
                    </button>
                  </div>
                ) : (
                  <div className="pt-6 mt-6 border-t border-stone-300/70 flex flex-wrap items-center justify-between gap-4">
                    <p className="text-xs text-stone-600">
                      Be the premier contributor to Safwa Publishers. Submit your fiction, poetry, or monograph.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActivePage('submit')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap"
                    >
                      {t.writeOnSafwaCta}
                    </button>
                  </div>
                )}
              </div>

              {/* Requested Overscaling Box: "Write on Safwa Publishers" (5 columns) */}
              <div
                onClick={() => setActivePage('submit')}
                role="region"
                aria-label="Write on Safwa Publishers Overscaling Callout"
                className="overscale-box lg:col-span-5 cursor-pointer p-8 rounded-2xl bg-stone-900 text-stone-100 border border-stone-800 flex flex-col justify-between shadow-lg"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 font-semibold">
                    <PenTool className="w-4 h-4" />
                    <span>Open Trilingual Call for Manuscripts</span>
                  </div>

                  <h2 className="text-3xl font-display font-bold text-white leading-snug">
                    {t.writeOnSafwaTitle}
                  </h2>

                  <p className="text-sm text-stone-300 leading-relaxed">
                    {t.writeOnSafwaSub}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-stone-400">
                    Arabic · Malayalam · English
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePage('submit');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.writeOnSafwaCta}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Interactive Language & Section Filter Bar */}
            <section
              aria-label="Language and Section Filter Controls"
              className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200"
            >
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F3EFE6] rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('all')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    languageFilterAll
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  {t.allLanguagesLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('ar')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'ar'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Arabic (العربية)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('ml')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'ml'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  Malayalam (മലയാളം)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('en')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'en'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-700 hover:text-stone-950'
                  }`}
                >
                  English
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F3EFE6] rounded-xl border border-stone-200">
                {(
                  [
                    { id: 'all', label: t.secAll },
                    { id: 'fiction', label: t.secFiction },
                    { id: 'poetry', label: t.secPoetry },
                    { id: 'non-fiction', label: t.secNonFiction }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSectionFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                      activeSectionFilter === tab.id
                        ? 'bg-amber-800 text-white'
                        : 'text-stone-700 hover:text-stone-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Section 1: Latest Articles (Non-Fiction) */}
            {(activeSectionFilter === 'all' || activeSectionFilter === 'non-fiction') && (
              <section aria-label={t.latestArticles} className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-900">
                    01. {t.latestArticles}
                  </h2>
                  <span className="text-xs text-stone-500 font-mono-num">
                    {latestArticles.length} Works
                  </span>
                </div>

                {latestArticles.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3EFE6]/60 border border-dashed border-stone-300 text-center space-y-3">
                    <p className="text-sm font-display font-semibold text-stone-800">
                      No published articles in this edition yet
                    </p>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Safwa Publishers is freshly inaugurated. Share your research, literary essay, or monograph.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('non-fiction');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <PenTool className="w-3.5 h-3.5 text-amber-800" />
                      <span>Submit an Article</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {latestArticles.map((post) => (
                      <LiteraryWorkCard
                        key={post.id}
                        post={post}
                        activeLanguage={activeLanguage}
                        onOpenPost={handleOpenPost}
                        onOpenMessage={(uid, _name, _photo) => {
                          setMessageRecipientId(uid);
                          setIsMessagesOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Section 2: Trending Poems (Poetry) */}
            {(activeSectionFilter === 'all' || activeSectionFilter === 'poetry') && (
              <section aria-label={t.trendingPoems} className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-900">
                    02. {t.trendingPoems}
                  </h2>
                  <span className="text-xs text-stone-500 font-mono-num">
                    {trendingPoems.length} Works
                  </span>
                </div>

                {trendingPoems.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3EFE6]/60 border border-dashed border-stone-300 text-center space-y-3">
                    <p className="text-sm font-display font-semibold text-stone-800">
                      No published poems in this edition yet
                    </p>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Be the premier poet on Safwa. Submit your verses in Arabic, Malayalam, or English.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('poetry');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <PenTool className="w-3.5 h-3.5 text-amber-800" />
                      <span>Submit Poetry</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trendingPoems.map((post) => (
                      <LiteraryWorkCard
                        key={post.id}
                        post={post}
                        activeLanguage={activeLanguage}
                        onOpenPost={handleOpenPost}
                        onOpenMessage={(uid, _name, _photo) => {
                          setMessageRecipientId(uid);
                          setIsMessagesOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Section 3: This Week's Fiction (Fiction) */}
            {(activeSectionFilter === 'all' || activeSectionFilter === 'fiction') && (
              <section aria-label={t.thisWeeksFiction} className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-stone-900">
                    03. {t.thisWeeksFiction}
                  </h2>
                  <span className="text-xs text-stone-500 font-mono-num">
                    {weeksFiction.length} Works
                  </span>
                </div>

                {weeksFiction.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#F3EFE6]/60 border border-dashed border-stone-300 text-center space-y-3">
                    <p className="text-sm font-display font-semibold text-stone-800">
                      No published stories or novellas yet
                    </p>
                    <p className="text-xs text-stone-600 max-w-md mx-auto">
                      Begin a new narrative on Safwa. Submit your short story or chapter manuscript.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('fiction');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <PenTool className="w-3.5 h-3.5 text-amber-800" />
                      <span>Submit Fiction</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {weeksFiction.map((post) => (
                      <LiteraryWorkCard
                        key={post.id}
                        post={post}
                        activeLanguage={activeLanguage}
                        onOpenPost={handleOpenPost}
                        onOpenMessage={(uid, _name, _photo) => {
                          setMessageRecipientId(uid);
                          setIsMessagesOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {activePage === 'submit' && (
          <SubmitWorkView
            currentUser={currentUser}
            initialLanguage={submitDefaultLang}
            initialSection={submitDefaultSection}
            onSubmitWork={handleSubmitWork}
            onNavigateDashboard={() => setActivePage('dashboard')}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardAndAdminView
            currentUser={currentUser}
            authEmail={firebaseUser?.email || null}
            isGoogleSignedIn={Boolean(firebaseUser)}
            posts={posts}
            users={users}
            onOpenEditProfile={() => {
              setIsNewAccountFlow(false);
              setIsOnboardingOpen(true);
            }}
            onGoogleSignIn={handleGoogleSignIn}
            onOpenPost={handleOpenPost}
            onApprovePost={handleApprovePost}
            onRejectPost={handleRejectPost}
            onToggleUserBlueTick={handleToggleUserBlueTick}
            onNavigateSubmit={() => setActivePage('submit')}
          />
        )}

        {activePage === 'about' && (
          <AboutView
            activeLanguage={activeLanguage}
            officialAccount={SEED_USERS[0]}
            onNavigateSubmit={() => setActivePage('submit')}
            onOpenDirectMessage={(uid) => {
              setMessageRecipientId(uid);
              setIsMessagesOpen(true);
            }}
          />
        )}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-stone-200 bg-[#F3EFE6] px-6 py-8 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm text-stone-900">
              Safwa Publishers
            </span>
            <BlueTickBadge size={14} />
            <span>· Arabic, Malayalam & English Literary House</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="hover:text-stone-950"
            >
              {t.navHome}
            </button>
            <button
              type="button"
              onClick={() => setActivePage('submit')}
              className="hover:text-stone-950"
            >
              {t.navSubmit}
            </button>
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="hover:text-stone-950"
            >
              {t.navDashboard}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNewAccountFlow(true);
                setIsOnboardingOpen(true);
              }}
              className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:underline"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>New Author Setup</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Full Article Reader Modal (Increments View Count 1 -> 2 on each open) */}
      <ArticleReaderModal
        post={activeReadingPost}
        comments={activeReadingPost ? commentsByPost[activeReadingPost.id] || [] : []}
        currentUser={currentUser}
        isLiked={activeReadingPost ? Boolean(likedPostIds[activeReadingPost.id]) : false}
        isFollowingAuthor={
          activeReadingPost ? Boolean(followedAuthorIds[activeReadingPost.authorId]) : false
        }
        activeLanguage={activeLanguage}
        onClose={() => setReadingPostId(null)}
        onToggleLike={handleToggleLike}
        onAddComment={handleAddComment}
        onShareToStory={handleShareToStory}
        onToggleFollow={handleToggleFollow}
        onOpenDirectMessage={(uid) => {
          setReadingPostId(null);
          setMessageRecipientId(uid);
          setIsMessagesOpen(true);
        }}
      />

      {/* Instagram-Style Direct Messaging Modal */}
      <DirectMessagesModal
        isOpen={isMessagesOpen}
        currentUser={currentUser}
        users={users}
        messages={messages}
        initialRecipientId={messageRecipientId}
        onClose={() => setIsMessagesOpen(false)}
        onSendMessage={handleSendDirectMessage}
      />

      {/* Author Onboarding & Profile Picture Setup Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        initialProfile={currentUser}
        isNewRegistration={isNewAccountFlow}
        onClose={() => setIsOnboardingOpen(false)}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}

interface LiteraryWorkCardProps {
  post: LiteraryPost;
  activeLanguage: LanguageCode;
  onOpenPost: (post: LiteraryPost) => void;
  onOpenMessage: (uid: string, name: string, photo: string) => void;
}

const LiteraryWorkCard: React.FC<LiteraryWorkCardProps> = ({
  post,
  activeLanguage,
  onOpenPost,
  onOpenMessage
}) => {
  const t = UI_TRANSLATIONS[activeLanguage] || UI_TRANSLATIONS.en;

  return (
    <article className="overscale-card rounded-xl bg-white border border-stone-200/90 overflow-hidden flex flex-col justify-between">
      <div>
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="w-full text-left block group"
        >
          <img
            src={post.coverUrl}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="w-full h-48 object-cover border-b border-stone-100"
          />
          <div className="p-5">
            {/* Clean Unboxed Metadata with Typographic Separators */}
            <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
              <span>{formatSectionLabel(post.section, activeLanguage)}</span>
              <span aria-hidden="true">·</span>
              <span>{formatLanguageLabel(post.language)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num text-emerald-800">{post.aiScore}% AI</span>
            </div>

            <h3 className="text-xl font-display font-bold text-stone-900 group-hover:text-amber-900 transition-colors leading-snug">
              {post.title}
            </h3>

            {post.subtitle && (
              <p className="text-xs font-prose italic text-stone-600 mt-1 line-clamp-2">
                {post.subtitle}
              </p>
            )}

            <p className="text-xs font-prose text-stone-600 mt-2.5 line-clamp-3 leading-relaxed">
              {post.content}
            </p>
          </div>
        </button>
      </div>

      <div className="px-5 py-3.5 bg-[#FBF9F5] border-t border-stone-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={post.authorPhoto}
            alt={post.authorName}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover border border-stone-300 shrink-0"
          />
          <span className="text-xs font-semibold text-stone-800 truncate">
            {post.authorName}
          </span>
          {post.authorVerified && <BlueTickBadge size={13} />}
        </div>

        <div className="flex items-center gap-3 text-xs text-stone-600 shrink-0">
          <span
            className="inline-flex items-center gap-1 font-mono-num"
            title="Total Reads"
          >
            <Eye className="w-3.5 h-3.5 text-stone-400" />
            <span data-testid={`card-views-${post.id}`}>{post.viewsCount}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-mono-num">
            <Heart className="w-3.5 h-3.5 text-stone-400" />
            <span>{post.likesCount}</span>
          </span>
          <button
            type="button"
            onClick={() => onOpenMessage(post.authorId, post.authorName, post.authorPhoto)}
            aria-label={`Message ${post.authorName}`}
            className="text-stone-500 hover:text-stone-900"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenPost(post)}
            className="font-semibold text-amber-900 hover:underline whitespace-nowrap"
          >
            {t.readFullArticle}
          </button>
        </div>
      </div>
    </article>
  );
};
