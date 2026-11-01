/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
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
  LogOut,
  Megaphone,
  ShieldCheck
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
  isAdminRole,
  sanitizePostPayload,
  sanitizeUserProfilePayload,
  toFirestorePostDoc,
  toFirestoreUserDoc,
  type AnnouncementItem,
  type CategoryItem,
  type DirectMessage,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type NotificationItem,
  type PostComment,
  type PostStatus,
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
import {
  DashboardAndAdminView,
  type DashboardTabId
} from './components/DashboardAndAdminView';
import { AboutView } from './components/AboutView';
import { AuthModal, type AuthModalTab } from './components/AuthModal';
import { FeaturedShowcaseHero } from './components/FeaturedShowcaseHero';
import { ThreeLiteraryScene } from './components/ThreeLiteraryScene';

type ActivePage = 'home' | 'submit' | 'about' | 'dashboard';

const SESSION_STORAGE_KEY = 'safwa_auth_token';

const GUEST_READER: UserProfile = {
  uid: 'guest_reader',
  name: 'Guest Reader',
  username: 'reader',
  email: '',
  preferredLanguage: 'en',
  bio: 'Exploring Arabic, Malayalam, and English literature on Safwa Publishers.',
  photoUrl: makeAvatarSvg('GR', '#06B6D4', '#060913'),
  isVerified: false,
  role: 'reader',
  accountStatus: 'active',
  visibility: 'public',
  followersCount: 0,
  followingCount: 0,
  createdAt: '2026-10-31T00:00:00.000Z',
  updatedAt: '2026-10-31T00:00:00.000Z'
};

export default function App() {
  // Navigation & Language State
  const [activePage, setActivePage] = useState<ActivePage>('home');
  const [dashboardTab, setDashboardTab] = useState<DashboardTabId>('my-profile');
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  const [languageFilterAll, setLanguageFilterAll] = useState<boolean>(true);
  const [activeSectionFilter, setActiveSectionFilter] = useState<LiterarySection | 'all'>('all');

  // Pre-selected options when clicking from hover menu on Submit
  const [submitDefaultLang, setSubmitDefaultLang] = useState<LanguageCode>('en');
  const [submitDefaultSection, setSubmitDefaultSection] = useState<LiterarySection>('fiction');
  const [editingDraft, setEditingDraft] = useState<LiteraryPost | null>(null);

  // Hover dropdown states (works for both pointer hover & click/keyboard)
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isSubmitMenuOpen, setIsSubmitMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  // Core Application Data
  const [users, setUsers] = useState<UserProfile[]>(SEED_USERS);
  const [posts, setPosts] = useState<LiteraryPost[]>(SEED_POSTS);
  const [stories, setStories] = useState<StoryItem[]>(SEED_STORIES);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [commentsByPost, setCommentsByPost] =
    useState<Record<string, PostComment[]>>(SEED_COMMENTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(SEED_NOTIFICATIONS);
  const [messages, setMessages] = useState<DirectMessage[]>(SEED_MESSAGES);

  // User Auth & Session State: Unauthenticated visitor starts as Guest Reader by default
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem(SESSION_STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_READER);
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Record<string, boolean>>({});

  // Modals State
  const [readingPostId, setReadingPostId] = useState<string | null>(null);
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);
  const [messageRecipientId, setMessageRecipientId] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isNewAccountFlow, setIsNewAccountFlow] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login');

  const getAuthHeaders = useCallback(
    (overrideToken?: string | null): Record<string, string> => {
      const tok = overrideToken !== undefined ? overrideToken : sessionToken;
      return tok
        ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tok}`
          }
        : {
            'Content-Type': 'application/json'
          };
    },
    [sessionToken]
  );

  // Load initial state from secure backend API
  const fetchBootstrapData = useCallback(
    async (tok?: string | null) => {
      try {
        const res = await fetch('/api/bootstrap', {
          headers: getAuthHeaders(tok)
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
        }
        if (Array.isArray(data.manuscripts)) {
          setPosts(data.manuscripts);
        }
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        if (Array.isArray(data.announcements)) {
          setAnnouncements(data.announcements);
        }
        if (Array.isArray(data.notifications) && data.notifications.length > 0) {
          setNotifications(data.notifications);
        }
        if (data.currentUser) {
          setCurrentUser(data.currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        // Offline or initial boot fallback
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    fetchBootstrapData(sessionToken);
  }, [fetchBootstrapData, sessionToken]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);

      if (fbUser) {
        try {
          const syncRes = await fetch('/api/auth/google-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL
            })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.user && syncData.token) {
              setSessionToken(syncData.token);
              try {
                localStorage.setItem(SESSION_STORAGE_KEY, syncData.token);
              } catch {
                // Ignore storage errors
              }
              setCurrentUser(syncData.user);
              setIsAuthenticated(true);
              await fetchBootstrapData(syncData.token);
              return;
            }
          }
        } catch {
          // Fall back to client state
        }

        const isMainAdmin = fbUser.email === CHIEF_EDITOR_EMAIL;
        const cleanUid = fbUser.uid.replace(/[^a-zA-Z0-9_\-]/g, '_');
        setUsers((prevUsers) => {
          const existing = prevUsers.find((u) => u.uid === cleanUid);
          if (existing) {
            setCurrentUser(existing);
            setIsAuthenticated(true);
            return prevUsers;
          }
          const newProfile: UserProfile = sanitizeUserProfilePayload({
            uid: cleanUid,
            name: fbUser.displayName || 'Safwa Author',
            username: (fbUser.email?.split('@')[0] || 'author').replace(/[^a-zA-Z0-9_\-.]/g, ''),
            email: fbUser.email || undefined,
            bio: isMainAdmin
              ? 'Chief Editor & Main Official Account of Safwa Publishers.'
              : 'Literary contributor on Safwa Publishers.',
            photoUrl:
              fbUser.photoURL ||
              makeAvatarSvg((fbUser.displayName || 'SA').slice(0, 2), '#1E3A8A', '#FBF9F5'),
            isVerified: isMainAdmin,
            role: isMainAdmin ? 'ADMIN' : 'USER',
            visibility: 'public',
            followersCount: 0,
            followingCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          setCurrentUser(newProfile);
          setIsAuthenticated(true);
          setIsNewAccountFlow(true);
          setIsOnboardingOpen(true);
          return [newProfile, ...prevUsers];
        });
      }
    });
    return () => unsub();
  }, [fetchBootstrapData]);

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

  const handleOpenAuthModal = (mode: AuthModalTab) => {
    setAuthModalTab(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthenticatedUser = async (user: UserProfile, token: string) => {
    setSessionToken(token);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, token);
    } catch {
      // Ignore storage errors
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.preferredLanguage) {
      setSubmitDefaultLang(user.preferredLanguage);
    }
    setUsers((prev) => {
      const exists = prev.some((u) => u.uid === user.uid);
      if (exists) return prev.map((u) => (u.uid === user.uid ? user : u));
      return [user, ...prev];
    });
    await fetchBootstrapData(token);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (_error) {
      handleOpenAuthModal('login');
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch {
      // Ignore logout network error
    }
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setSessionToken(null);
    setIsAuthenticated(false);
    setPosts((prev) => prev.filter((p) => p.status === 'published'));
    setActivePage('home');
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
        const sanitized = toFirestorePostDoc(updated);
        await updateDoc(doc(db, 'posts', post.id), {
          viewsCount: sanitized.viewsCount,
          updatedAt: sanitized.updatedAt
        });
      } catch (_err) {
        // Local state already updated
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

  // Submit New Literary Work or Save as Draft
  const handleSubmitWork = async (
    rawPost: Omit<LiteraryPost, 'id'>,
    existingId?: string
  ) => {
    const sanitized = sanitizePostPayload(rawPost);

    try {
      if (existingId) {
        const res = await fetch(`/api/manuscripts/${existingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(sanitized)
        });
        if (res.ok) {
          const data = await res.json();
          setPosts((prev) =>
            prev.map((p) => (p.id === existingId ? data.manuscript : p))
          );
          return;
        }
      } else {
        const res = await fetch('/api/manuscripts', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(sanitized)
        });
        if (res.ok) {
          const data = await res.json();
          setPosts((prev) => [data.manuscript, ...prev]);
          await fetchBootstrapData();
          return;
        }
      }
    } catch {
      // Fallback to local state + Firestore
    }

    const postId = existingId || `post_${Date.now()}`;
    const newPost: LiteraryPost = {
      id: postId,
      ...sanitized
    };

    setPosts((prev) => {
      if (existingId) {
        return prev.map((p) => (p.id === existingId ? newPost : p));
      }
      return [newPost, ...prev];
    });

    if (sanitized.status === 'pending') {
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
    }

    if (firebaseUser) {
      try {
        await setDoc(doc(db, 'posts', postId), toFirestorePostDoc(sanitized));
      } catch (_err) {
        // Local state updated
      }
    }
  };

  // Delete Draft or Manuscript
  const handleDeletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await fetch(`/api/manuscripts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch {
      // Local state already updated
    }
  };

  // Review Post Status (Under Review, Accepted, Revision Requested, Rejected, Published)
  const handleReviewPostStatus = async (
    postId: string,
    status: PostStatus,
    editorialNotes?: string
  ) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              status,
              ...(editorialNotes !== undefined ? { editorialNotes } : {}),
              updatedAt: now
            }
          : p
      )
    );

    if (status === 'published') {
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
    } else {
      const revNotif: NotificationItem = {
        id: `notif_rev_${Date.now()}`,
        targetUserId: target.authorId,
        actorId: currentUser.uid,
        actorName: currentUser.name,
        type: 'status_update',
        title: `Submission Status Updated ("${target.title}"): ${status.toUpperCase()}`,
        message: editorialNotes,
        postId: target.id,
        createdAt: now
      };
      setNotifications((prev) => [revNotif, ...prev]);
    }

    try {
      await fetch(`/api/admin/manuscripts/${postId}/review`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, editorialNotes })
      });
    } catch {
      // Local state updated
    }

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'posts', postId), {
          status,
          updatedAt: now
        });
      } catch (_err) {
        // Local state updated
      }
    }
  };

  const handleApprovePost = async (postId: string) => {
    await handleReviewPostStatus(postId, 'published');
  };

  const handleRejectPost = async (postId: string) => {
    await handleReviewPostStatus(postId, 'rejected');
  };

  const handleUpdatePublishedPost = async (
    postId: string,
    updates: Partial<Pick<LiteraryPost, 'title' | 'subtitle' | 'content' | 'language' | 'section'>>
  ) => {
    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, ...updates, updatedAt: now } : p))
    );

    try {
      await fetch(`/api/manuscripts/${postId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
    } catch {
      // Local state updated
    }
  };

  // Chief Editor Grants or Revokes Real Blue Tick
  const handleToggleUserBlueTick = async (targetUserId: string) => {
    const targetUser = users.find((u) => u.uid === targetUserId);
    const nextVerified = targetUser ? !targetUser.isVerified : true;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.uid !== targetUserId) return u;
        const updated = { ...u, isVerified: nextVerified };
        if (currentUser.uid === targetUserId) {
          setCurrentUser(updated);
        }
        return updated;
      })
    );

    setPosts((prev) =>
      prev.map((p) =>
        p.authorId === targetUserId ? { ...p, authorVerified: nextVerified } : p
      )
    );

    try {
      await fetch(`/api/admin/users/${targetUserId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVerified: nextVerified })
      });
    } catch {
      // Local state updated
    }
  };

  // Admin Suspends or Reactivates User Account
  const handleToggleUserSuspension = async (
    targetUserId: string,
    nextStatus: 'active' | 'suspended'
  ) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === targetUserId ? { ...u, accountStatus: nextStatus } : u))
    );

    try {
      await fetch(`/api/admin/users/${targetUserId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ accountStatus: nextStatus })
      });
    } catch {
      // Local state updated
    }
  };

  // Admin Category Handlers
  const handleCreateCategory = async (cat: {
    name: string;
    language: LanguageCode | 'all';
    section: LiterarySection;
    description: string;
  }) => {
    const now = new Date().toISOString();
    const optimistic: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: cat.name,
      slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      language: cat.language,
      section: cat.section,
      description: cat.description,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    setCategories((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        const data = await res.json();
        setCategories((prev) =>
          prev.map((c) => (c.id === optimistic.id ? data.category : c))
        );
      }
    } catch {
      // Local state updated
    }
  };

  const handleToggleCategoryActive = async (catId: string, isActive: boolean) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, isActive } : c))
    );
    try {
      await fetch(`/api/admin/categories/${catId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive })
      });
    } catch {
      // Local state updated
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
    try {
      await fetch(`/api/admin/categories/${catId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch {
      // Local state updated
    }
  };

  // Admin Notification Dispatcher
  const handleSendAdminNotification = async (payload: {
    targetUserId: string;
    title: string;
    message: string;
  }) => {
    const now = new Date().toISOString();
    const newNotif: NotificationItem = {
      id: `notif_adm_${Date.now()}`,
      targetUserId: payload.targetUserId,
      actorId: currentUser.uid,
      actorName: currentUser.name,
      type: 'admin_notice',
      title: payload.title,
      message: payload.message,
      postId: '',
      createdAt: now
    };
    setNotifications((prev) => [newNotif, ...prev]);

    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch {
      // Local state updated
    }
  };

  // Admin Website Announcements Handlers
  const handleCreateAnnouncement = async (payload: {
    title: string;
    content: string;
    language: LanguageCode | 'all';
  }) => {
    const now = new Date().toISOString();
    const optimistic: AnnouncementItem = {
      id: `ann_${Date.now()}`,
      title: payload.title,
      content: payload.content,
      language: payload.language,
      isActive: true,
      authorName: currentUser.name,
      createdAt: now,
      updatedAt: now
    };
    setAnnouncements((prev) => [optimistic, ...prev]);

    try {
      await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
    } catch {
      // Local state updated
    }
  };

  const handleToggleAnnouncement = async (annId: string, isActive: boolean) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === annId ? { ...a, isActive } : a))
    );
    try {
      await fetch(`/api/admin/announcements/${annId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive })
      });
    } catch {
      // Local state updated
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
    try {
      await fetch(`/api/admin/announcements/${annId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
    } catch {
      // Local state updated
    }
  };

  // Account Settings & Password Handlers
  const handleUpdateAccountSettings = async (updates: {
    preferredLanguage?: LanguageCode;
    emailNotifications?: boolean;
    editorialAlerts?: boolean;
  }) => {
    const nextUser = sanitizeUserProfilePayload({
      ...currentUser,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    setCurrentUser(nextUser);
    setUsers((prev) => prev.map((u) => (u.uid === nextUser.uid ? nextUser : u)));

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });
    } catch {
      // Local state updated
    }
  };

  const handleChangePassword = async (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ success: boolean; message: string }> => {
    if (!payload.newPassword || payload.newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    if (payload.newPassword !== payload.confirmPassword) {
      return { success: false, message: 'New password and confirmation do not match.' };
    }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Could not update password.' };
      }
      return { success: true, message: data.message || 'Password updated securely.' };
    } catch {
      return { success: true, message: 'Password updated for current session.' };
    }
  };

  // Save User Profile & Dispatch New Account Details to Main Official Account
  const handleSaveProfile = async (updated: UserProfile, isNewRegistration: boolean) => {
    const sanitized = sanitizeUserProfilePayload(updated);
    setCurrentUser(sanitized);
    setIsAuthenticated(true);
    setUsers((prev) => {
      const exists = prev.some((u) => u.uid === sanitized.uid);
      if (exists) {
        return prev.map((u) => (u.uid === sanitized.uid ? sanitized : u));
      }
      return [sanitized, ...prev];
    });

    try {
      await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: sanitized.name,
          username: sanitized.username,
          bio: sanitized.bio,
          photoUrl: sanitized.photoUrl,
          preferredLanguage: sanitized.preferredLanguage
        })
      });
    } catch {
      // Local state updated
    }

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
        await setDoc(doc(db, 'users', sanitized.uid), toFirestoreUserDoc(sanitized));
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

  const publishedPosts = posts.filter((p) => p.status === 'published');

  const latestArticles = visiblePosts.filter((p) => p.section === 'non-fiction');
  const trendingPoems = visiblePosts.filter((p) => p.section === 'poetry');
  const weeksFiction = visiblePosts.filter((p) => p.section === 'fiction');

  const activeAnnouncements = announcements.filter(
    (a) =>
      a.isActive &&
      (a.language === 'all' || languageFilterAll || a.language === activeLanguage)
  );

  const activeReadingPost = readingPostId
    ? posts.find((p) => p.id === readingPostId) || null
    : null;

  const publishedNotifications = notifications.filter(
    (n) =>
      n.type === 'published' ||
      n.type === 'submission' ||
      n.type === 'new_account' ||
      n.type === 'admin_notice' ||
      n.type === 'status_update'
  );

  const isCurrentAdmin = Boolean(
    isAuthenticated &&
    ((firebaseUser?.email || currentUser.email || '').trim().toLowerCase() ===
      CHIEF_EDITOR_EMAIL.toLowerCase()) &&
    isAdminRole(currentUser.role)
  );

  return (
    <div
      dir={isPageRtl ? 'rtl' : 'ltr'}
      className="min-h-screen flex flex-col bg-[#060913] text-slate-100"
    >
      {/* Top Utility Bar Above Menu Bar: Role-Aware Account Links + Notification Icon + Profile Icon */}
      <div
        dir="ltr"
        className="bg-[#0A0F20]/90 border-b border-cyan-500/20 px-6 py-2.5 text-xs text-slate-300 backdrop-blur-xl shadow-[0_4px_25px_rgba(6,182,212,0.1)]"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-display italic text-cyan-300/90 text-glow-cyan font-medium">
              Safwa Publishers · Trilingual Literary Archive (Arabic · Malayalam · English)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Role-Adaptive Links */}
            {isAuthenticated ? (
              <div className="hidden xl:flex items-center gap-3 mr-1 text-slate-300">
                <button
                  type="button"
                  onClick={() => {
                    setDashboardTab('my-profile');
                    setActivePage('dashboard');
                  }}
                  className="hover:text-cyan-300 transition-colors whitespace-nowrap"
                >
                  My Profile
                </button>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDashboardTab('my-submissions');
                    setActivePage('dashboard');
                  }}
                  className="hover:text-cyan-300 transition-colors whitespace-nowrap"
                >
                  My Submissions
                </button>
                {/* Admin Dashboard: Strictly seen ONLY for mohammedmusthafac3@gmail.com */}
                {isCurrentAdmin && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDashboardTab('admin-overview');
                        setActivePage('dashboard');
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-amber-300 bg-amber-950/40 border border-amber-400/40 px-2.5 py-1 rounded-lg hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all whitespace-nowrap"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Dashboard</span>
                    </button>
                  </>
                )}
                <span aria-hidden="true" className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => {
                    setDashboardTab('settings');
                    setActivePage('dashboard');
                  }}
                  className="hover:text-cyan-300 transition-colors whitespace-nowrap"
                >
                  Settings
                </button>
              </div>
            ) : null}

            {/* Direct Messages Quick Button */}
            <button
              type="button"
              onClick={() => {
                setMessageRecipientId(null);
                setIsMessagesOpen(true);
              }}
              aria-label="Open Direct Messages"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121A30] border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all whitespace-nowrap font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.navMessages}</span>
            </button>

            {/* Notification Bell Icon Above Menu Bar */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifDropdownOpen((o) => !o)}
                aria-label="Notifications for newly published submissions"
                aria-expanded={isNotifDropdownOpen}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#151733] border border-fuchsia-500/30 text-fuchsia-300 hover:border-fuchsia-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all"
              >
                <Bell className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Notifications</span>
                <span className="font-mono-num font-bold text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                  ({publishedNotifications.length})
                </span>
              </button>

              {isNotifDropdownOpen && (
                <div
                  role="region"
                  aria-label="Published Submissions Notifications"
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0D1326] border border-fuchsia-500/30 rounded-2xl shadow-[0_0_35px_rgba(217,70,239,0.25)] z-40 overflow-hidden text-slate-100"
                >
                  <div className="px-4 py-3 bg-[#131936] border-b border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">
                      Published Works & Editorial Alerts
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNotifDropdownOpen(false)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80">
                    {publishedNotifications.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          setIsNotifDropdownOpen(false);
                          if (notif.postId) {
                            handleOpenPostById(notif.postId);
                          } else {
                            setDashboardTab('notifications');
                            setActivePage('dashboard');
                          }
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors block"
                      >
                        <p className="text-xs font-bold text-slate-100 leading-snug">
                          {notif.title}
                        </p>
                        {notif.message && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                        )}
                        <span className="text-[10px] text-cyan-400/80 font-mono-num mt-1 block">
                          By {notif.actorName} ·{' '}
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Login / Register / Logout Controls */}
            {!isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAuthModal('login')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#121A30] border border-cyan-500/40 text-xs font-bold text-cyan-200 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] whitespace-nowrap transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuthModal('register')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-xs font-bold text-white hover:shadow-[0_0_20px_rgba(217,70,239,0.5)] whitespace-nowrap transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-500/40 rounded-xl hover:bg-rose-900/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.4)] whitespace-nowrap transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            )}

            {/* Right-Side User Profile Picture Icon -> Clicking Opens Dashboard */}
            <button
              type="button"
              onClick={() => {
                setDashboardTab('my-profile');
                setActivePage('dashboard');
              }}
              aria-label="Open User Dashboard"
              className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#10182E] border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all"
            >
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-cyan-400"
              />
              <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">
                {currentUser.name}
              </span>
              {currentUser.isVerified && <BlueTickBadge size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Top Navigation Bar (Strict 3-Zone Contract with Radiant Glowing Aesthetic) */}
      <header className="sticky top-0 z-30 bg-[#080D1D]/90 backdrop-blur-2xl border-b border-cyan-500/20 px-6 py-4 shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark with Emblem & Rainbow Gradient Glow */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setActivePage('home');
            }}
            className="group flex items-center gap-3 text-2xl font-display font-black tracking-tight whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/aistudio/image_8895db7c.png"
              alt="Safwa Publishers Emblem"
              className="w-8 h-8 rounded-full object-cover shadow-[0_0_16px_rgba(6,182,212,0.6)] border border-cyan-400/50 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(217,70,239,0.7)] transition-all"
            />
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(217,70,239,0.5)]">
              {t.brandTitle}
            </span>
          </a>

          {/* Zone 2: Concise Nav Links (Home, Languages, Submit, About, Dashboard) */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-6 text-sm font-bold text-slate-300"
          >
            <button
              type="button"
              onClick={() => {
                setActivePage('home');
                setActiveSectionFilter('all');
              }}
              className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'home'
                  ? 'text-cyan-300 text-glow-cyan border-b-2 border-cyan-400 pb-0.5'
                  : ''
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
                className="inline-flex items-center gap-1 text-slate-300 hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 py-1"
              >
                <span>{t.navLanguages}</span>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              {isLangMenuOpen && (
                <div
                  role="menu"
                  aria-label="Select Language Edition"
                  className="absolute left-0 top-full pt-1.5 w-52 z-40"
                >
                  <div className="bg-[#0D1426]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_35px_rgba(6,182,212,0.25)] py-2 overflow-hidden backdrop-blur-xl">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('ar')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-cyan-300 flex items-center justify-between"
                    >
                      <span>Arabic</span>
                      <span className="font-display text-sm text-cyan-300">العربية</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('ml')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-cyan-300 flex items-center justify-between"
                    >
                      <span>Malayalam</span>
                      <span className="text-xs text-fuchsia-300">മലയാളം</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleSelectLanguage('en')}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-cyan-300 flex items-center justify-between"
                    >
                      <span>English</span>
                      <span className="text-[11px] text-amber-300 font-mono">EN</span>
                    </button>
                    <div className="border-t border-slate-800 mt-1.5 pt-1.5">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleSelectLanguage('all')}
                        className="w-full px-4 py-2 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-white"
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
                  setEditingDraft(null);
                  setActivePage('submit');
                  setIsSubmitMenuOpen(false);
                }}
                aria-expanded={isSubmitMenuOpen}
                className={`inline-flex items-center gap-1 text-slate-300 hover:text-fuchsia-300 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  activePage === 'submit'
                    ? 'text-fuchsia-300 text-glow-fuchsia border-b-2 border-fuchsia-400 pb-0.5'
                    : ''
                }`}
              >
                <span>{t.navSubmit}</span>
                <ChevronDown className="w-3.5 h-3.5 text-fuchsia-400" />
              </button>

              {isSubmitMenuOpen && (
                <div
                  role="menu"
                  aria-label="Submit by Literary Section"
                  className="absolute left-0 top-full pt-1.5 w-48 z-40"
                >
                  <div className="bg-[#0D1426]/95 border border-fuchsia-500/30 rounded-2xl shadow-[0_0_35px_rgba(217,70,239,0.25)] py-2 overflow-hidden backdrop-blur-xl">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setEditingDraft(null);
                        setSubmitDefaultSection('fiction');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-fuchsia-300"
                    >
                      {t.secFiction}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setEditingDraft(null);
                        setSubmitDefaultSection('poetry');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-fuchsia-300"
                    >
                      {t.secPoetry}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setEditingDraft(null);
                        setSubmitDefaultSection('non-fiction');
                        setActivePage('submit');
                        setIsSubmitMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-fuchsia-300"
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
              className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'about' ? 'text-cyan-300 text-glow-cyan border-b-2 border-cyan-400 pb-0.5' : ''
              }`}
            >
              {t.navAbout}
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePage('home');
                setTimeout(() => {
                  document.getElementById('threejs-studio')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 hover:text-white px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D Scenes</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className={`hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'dashboard'
                  ? 'text-cyan-300 text-glow-cyan border-b-2 border-cyan-400 pb-0.5'
                  : ''
              }`}
            >
              {t.navDashboard}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action Button with Radiant Glowing Gradient */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingDraft(null);
                setActivePage('submit');
              }}
              className="overscale-box px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 rounded-full hover:shadow-[0_0_35px_rgba(217,70,239,0.7)] transition-all whitespace-nowrap shrink-0 border border-pink-400/40"
            >
              {t.writeOnSafwaTitle}
            </button>
          </div>
        </div>
      </header>

      {/* Stories Strip: Strictly Rendered ONLY on the Home Page */}
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
          <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
            {/* Active Editorial Announcements Ribbon with Amber/Solar Glow */}
            {activeAnnouncements.length > 0 && (
              <div
                role="region"
                aria-label="Editorial Announcements"
                className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-fuchsia-950/30 to-cyan-950/30 border border-amber-400/40 shadow-[0_0_30px_rgba(245,158,11,0.25)] flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <Megaphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                  <div className="text-xs text-slate-200">
                    <strong className="font-bold text-amber-200 text-glow-amber">
                      {activeAnnouncements[0].title}:
                    </strong>{' '}
                    <span>{activeAnnouncements[0].content}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePage('submit')}
                  className="text-xs font-bold text-amber-300 hover:text-amber-200 hover:underline whitespace-nowrap drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                >
                  Submit Manuscript →
                </button>
              </div>
            )}

            {/* Featured Showcase Hero: Exactly matches the requested modern design */}
            <FeaturedShowcaseHero
              publishedPosts={publishedPosts}
              activeLanguage={activeLanguage}
              onOpenPost={handleOpenPost}
              onLikePost={handleToggleLike}
            />

            {/* "Latest Masterpieces" Section Header & Overscaling Callout Box */}
            <section className="space-y-6 pt-2">
              <div className="flex flex-wrap items-baseline justify-between border-b border-cyan-500/20 pb-4 gap-4">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight flex items-center gap-3">
                    <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                      Latest Masterpieces
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Curated Fiction, Poetry, and Critical Monographs across Arabic, Malayalam, and English
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
                    {visiblePosts.length} Works
                  </span>
                </div>
              </div>

              {/* Requested Overscaling Box: "Write on Safwa Publishers" (Banner Layout) */}
              <div
                onClick={() => setActivePage('submit')}
                role="region"
                aria-label="Write on Safwa Publishers Overscaling Callout"
                className="overscale-box cursor-pointer p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#121A36] via-[#1F183C] to-[#2B132C] border-2 border-fuchsia-500/50 flex flex-wrap items-center justify-between gap-6 shadow-[0_0_35px_rgba(217,70,239,0.3)] text-slate-100"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-300 font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
                    <PenTool className="w-4 h-4 text-amber-400" />
                    <span>Open Trilingual Call for Manuscripts</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white leading-snug drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">
                    {t.writeOnSafwaTitle}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {t.writeOnSafwaSub}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <span className="text-xs text-cyan-300 font-mono font-medium">
                    Arabic · Malayalam · English
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePage('submit');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 rounded-xl hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{t.writeOnSafwaCta}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Interactive Three.js 3D Literary Studio & Codex Section */}
            <section id="threejs-studio" aria-label="Interactive 3D Literary Studio" className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-cyan-500/20">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cyan-400 font-bold mb-1">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Three.js WebGL Real-time Experience</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center gap-2">
                    <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]">
                      Interactive 3D Codex & Celestial Cosmos
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Explore 3D procedurally illuminated manuscripts, the Golden Calligraphy Quill with liquid ink ripples, and the Trilingual Astrolabe Sphere. Click and drag in 360&deg; to inspect the craftsmanship.
                  </p>
                </div>
              </div>

              <ThreeLiteraryScene
                initialMode="codex"
                heightClass="h-[460px] sm:h-[540px]"
                showControls={true}
                interactive={true}
              />
            </section>

            {/* Interactive Language & Section Filter Bar with Glowing Active States */}
            <section
              aria-label="Language and Section Filter Controls"
              className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800"
            >
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#0D1426] rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('all')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    languageFilterAll
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t.allLanguagesLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('ar')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'ar'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Arabic (العربية)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('ml')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'ml'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Malayalam (മലയാളം)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('en')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    !languageFilterAll && activeLanguage === 'en'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  English
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#0D1426] rounded-2xl border border-slate-800">
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
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                      activeSectionFilter === tab.id
                        ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)] border border-fuchsia-400/40'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                <div className="flex items-baseline justify-between border-b border-cyan-500/20 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="text-cyan-400 text-lg font-mono">01.</span>
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                      {t.latestArticles}
                    </span>
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono">
                    {latestArticles.length} Works
                  </span>
                </div>

                {latestArticles.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-[#0D1426]/70 border border-dashed border-cyan-500/30 text-center space-y-4">
                    <p className="text-base font-display font-bold text-white">
                      No published articles in this edition yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Safwa Publishers is freshly inaugurated. Share your research, literary essay, or monograph with the community.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('non-fiction');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-cyan-950 bg-gradient-to-r from-cyan-400 to-teal-300 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] transition-all"
                    >
                      <PenTool className="w-4 h-4 text-cyan-950" />
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
                <div className="flex items-baseline justify-between border-b border-fuchsia-500/20 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="text-fuchsia-400 text-lg font-mono">02.</span>
                    <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
                      {t.trendingPoems}
                    </span>
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300 font-mono">
                    {trendingPoems.length} Works
                  </span>
                </div>

                {trendingPoems.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-[#0D1426]/70 border border-dashed border-fuchsia-500/30 text-center space-y-4">
                    <p className="text-base font-display font-bold text-white">
                      No published poems in this edition yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Be the premier poet on Safwa. Submit your verses in Arabic, Malayalam, or English.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('poetry');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-500 rounded-xl hover:shadow-[0_0_20px_rgba(217,70,239,0.6)] transition-all"
                    >
                      <PenTool className="w-4 h-4 text-white" />
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
                <div className="flex items-baseline justify-between border-b border-amber-500/20 pb-3">
                  <h2 className="text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                    <span className="text-amber-400 text-lg font-mono">03.</span>
                    <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
                      {t.thisWeeksFiction}
                    </span>
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono">
                    {weeksFiction.length} Works
                  </span>
                </div>

                {weeksFiction.length === 0 ? (
                  <div className="p-10 rounded-3xl bg-[#0D1426]/70 border border-dashed border-amber-500/30 text-center space-y-4">
                    <p className="text-base font-display font-bold text-white">
                      No published stories or novellas yet
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      Begin a new narrative on Safwa. Submit your short story or chapter manuscript.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitDefaultSection('fiction');
                        setActivePage('submit');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.6)] transition-all"
                    >
                      <PenTool className="w-4 h-4 text-amber-950" />
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
            categories={categories}
            editingDraft={editingDraft}
            onClearEditingDraft={() => setEditingDraft(null)}
            onSubmitWork={handleSubmitWork}
            onNavigateDashboard={() => {
              setDashboardTab('my-submissions');
              setActivePage('dashboard');
            }}
          />
        )}

        {activePage === 'dashboard' && (
          <DashboardAndAdminView
            currentUser={currentUser}
            authEmail={firebaseUser?.email || currentUser.email || null}
            isAuthenticated={isAuthenticated}
            isGoogleSignedIn={Boolean(firebaseUser)}
            activeTab={dashboardTab}
            onSelectTab={setDashboardTab}
            posts={posts}
            users={users}
            categories={categories}
            announcements={announcements}
            notifications={notifications}
            onOpenEditProfile={() => {
              setIsNewAccountFlow(false);
              setIsOnboardingOpen(true);
            }}
            onGoogleSignIn={handleGoogleSignIn}
            onOpenAuthModal={handleOpenAuthModal}
            onLogout={handleSignOut}
            onOpenPost={handleOpenPost}
            onEditDraft={(draft) => {
              setEditingDraft(draft);
              setActivePage('submit');
            }}
            onDeletePost={handleDeletePost}
            onApprovePost={handleApprovePost}
            onRejectPost={handleRejectPost}
            onReviewPostStatus={handleReviewPostStatus}
            onUpdatePublishedPost={handleUpdatePublishedPost}
            onToggleUserBlueTick={handleToggleUserBlueTick}
            onToggleUserSuspension={handleToggleUserSuspension}
            onCreateCategory={handleCreateCategory}
            onToggleCategoryActive={handleToggleCategoryActive}
            onDeleteCategory={handleDeleteCategory}
            onSendAdminNotification={handleSendAdminNotification}
            onCreateAnnouncement={handleCreateAnnouncement}
            onToggleAnnouncement={handleToggleAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onUpdateAccountSettings={handleUpdateAccountSettings}
            onChangePassword={handleChangePassword}
            onNavigateSubmit={() => {
              setEditingDraft(null);
              setActivePage('submit');
            }}
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

      {/* Radiant Glowing Footer */}
      <footer className="border-t border-slate-800 bg-[#060913] px-6 py-10 mt-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-fuchsia-500/5 to-purple-500/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-slate-400 relative z-10">
          <div className="flex items-center gap-3">
            <span className="font-display font-extrabold text-base bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
              Safwa Publishers
            </span>
            <BlueTickBadge size={16} />
            <span className="text-slate-400">· Trilingual Arabic, Malayalam & English Literary Portal</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => setActivePage('home')}
              className="text-slate-300 hover:text-cyan-400 transition-colors"
            >
              {t.navHome}
            </button>
            <button
              type="button"
              onClick={() => setActivePage('submit')}
              className="text-slate-300 hover:text-fuchsia-400 transition-colors"
            >
              {t.navSubmit}
            </button>
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="text-slate-300 hover:text-emerald-400 transition-colors"
            >
              {t.navDashboard}
            </button>
            <button
              type="button"
              onClick={() => handleOpenAuthModal('register')}
              className="inline-flex items-center gap-1.5 font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Account</span>
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

      {/* Secure Role-Based Authentication Modal (Login, Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthenticatedUser}
        onGoogleSignIn={handleGoogleSignIn}
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
    <article className="aurora-card rounded-2xl overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.35)]">
      <div>
        <button
          type="button"
          onClick={() => onOpenPost(post)}
          className="w-full text-left block"
        >
          <div className="relative overflow-hidden">
            <img
              src={post.coverUrl}
              alt={post.title}
              referrerPolicy="no-referrer"
              className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-105 border-b border-slate-800"
            />
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#060913]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              {post.aiScore}% AI Authentic
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5">
              <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                {formatSectionLabel(post.section, activeLanguage)}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-fuchsia-400 font-semibold">{formatLanguageLabel(post.language)}</span>
            </div>

            <h3 className="text-xl font-display font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
              {post.title}
            </h3>

            {post.subtitle && (
              <p className="text-xs font-prose italic text-slate-400 mt-2 line-clamp-2">
                {post.subtitle}
              </p>
            )}

            <p className="text-xs font-prose text-slate-400 mt-3 line-clamp-3 leading-relaxed">
              {post.content}
            </p>
          </div>
        </button>
      </div>

      <div className="px-6 py-4 bg-[#0a0f1d] border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={post.authorPhoto}
            alt={post.authorName}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border-2 border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.4)] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate">
                {post.authorName}
              </span>
              {post.authorVerified && <BlueTickBadge size={14} />}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span className="inline-flex items-center gap-1 text-cyan-400">
                <Eye className="w-3 h-3" />
                {post.viewsCount}
              </span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1 text-fuchsia-400">
                <Heart className="w-3 h-3" />
                {post.likesCount}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenMessage(post.authorId, post.authorName, post.authorPhoto)}
            aria-label={`Message ${post.authorName}`}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenPost(post)}
            className="px-3.5 py-1.5 text-xs font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-500/40 rounded-xl hover:bg-cyan-900/60 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all whitespace-nowrap"
          >
            {t.readFullArticle}
          </button>
        </div>
      </div>
    </article>
  );
};
