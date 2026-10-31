import React, { useState } from 'react';
import {
  X,
  Heart,
  Eye,
  MessageSquare,
  Sparkles,
  UserPlus,
  UserCheck,
  Send,
  Clock,
  ShieldCheck
} from 'lucide-react';
import type {
  LanguageCode,
  LiteraryPost,
  PostComment,
  UserProfile
} from '../utils/editorialLogic';
import { UI_TRANSLATIONS, formatLanguageLabel, formatSectionLabel } from '../data/seedCatalog';
import { BlueTickBadge } from './BlueTickBadge';

interface ArticleReaderModalProps {
  post: LiteraryPost | null;
  comments: PostComment[];
  currentUser: UserProfile;
  isLiked: boolean;
  isFollowingAuthor: boolean;
  activeLanguage: LanguageCode;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onShareToStory: (post: LiteraryPost, durationSeconds: number) => void;
  onToggleFollow: (authorId: string) => void;
  onOpenDirectMessage: (authorId: string, authorName: string, authorPhoto: string) => void;
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({
  post,
  comments,
  currentUser,
  isLiked,
  isFollowingAuthor,
  activeLanguage,
  onClose,
  onToggleLike,
  onAddComment,
  onShareToStory,
  onToggleFollow,
  onOpenDirectMessage
}) => {
  const [commentText, setCommentText] = useState('');
  const [storyDuration, setStoryDuration] = useState<number>(15);
  const [storySharedBanner, setStorySharedBanner] = useState(false);

  if (!post) return null;

  const t = UI_TRANSLATIONS[activeLanguage] || UI_TRANSLATIONS.en;
  const isPostRtl = post.language === 'ar';

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(post.id, commentText.trim());
    setCommentText('');
  };

  const handleSetStory = () => {
    onShareToStory(post, storyDuration);
    setStorySharedBanner(true);
    window.setTimeout(() => setStorySharedBanner(false), 3500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs overflow-y-auto flex items-start justify-center p-4 md:p-8"
    >
      <article className="relative w-full max-w-4xl bg-[#FBF9F5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden my-4">
        {/* Top Utility Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#FBF9F5]/95 backdrop-blur-xs border-b border-stone-200">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span>{formatSectionLabel(post.section, activeLanguage)}</span>
            <span aria-hidden="true">·</span>
            <span>{formatLanguageLabel(post.language)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 font-mono-num text-stone-800 font-medium">
              <Eye className="w-3.5 h-3.5 text-amber-800" />
              <span data-testid="reader-view-count">{post.viewsCount}</span> {t.viewsLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close article reader"
            className="p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cover Artwork */}
        <div className="relative bg-stone-900">
          <img
            src={post.coverUrl}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="w-full max-h-80 object-cover"
          />
        </div>

        {/* Main Reading Column */}
        <div className="px-6 md:px-12 py-8" dir={isPostRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-stone-900 leading-tight">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="text-lg font-display italic text-stone-600 mt-2">
              {post.subtitle}
            </p>
          )}

          {/* Author Attribution & Follow / Message Bar */}
          <div
            dir="ltr"
            className="flex flex-wrap items-center justify-between gap-4 py-5 my-6 border-y border-stone-200"
          >
            <div className="flex items-center gap-3">
              <img
                src={post.authorPhoto}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-stone-300"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-900">
                    {post.authorName}
                  </span>
                  {post.authorVerified && <BlueTickBadge size={16} />}
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span>@{post.authorUsername}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AI Check: <strong className="font-mono-num">{post.aiScore}% AI</strong>
                  </span>
                </div>
              </div>
            </div>

            {post.authorId !== currentUser.uid && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleFollow(post.authorId)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isFollowingAuthor
                      ? 'bg-stone-200 text-stone-900 hover:bg-stone-300'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{t.followingAuthor}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.followAuthor}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenDirectMessage(post.authorId, post.authorName, post.authorPhoto)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-800 bg-stone-100 border border-stone-300 rounded-lg hover:bg-stone-200 transition-colors whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.messageAuthor}</span>
                </button>
              </div>
            )}
          </div>

          {/* Literary Body Text */}
          <div className="max-w-2xl mx-auto my-8 space-y-5 font-prose text-base md:text-lg text-stone-800 leading-relaxed whitespace-pre-line">
            {post.content}
          </div>

          {/* Engagement & Story-Only Share Section */}
          <div
            dir="ltr"
            className="mt-10 p-5 rounded-xl bg-[#F3EFE6] border border-stone-200/90 flex flex-wrap items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onToggleLike(post.id)}
                aria-label="Like this literary work"
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                  isLiked
                    ? 'bg-rose-900 text-white border-rose-900'
                    : 'bg-[#FBF9F5] text-stone-800 border-stone-300 hover:bg-stone-200/70'
                }`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-mono-num">{post.likesCount}</span>
                <span>{t.likesLabel}</span>
              </button>

              <div className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                <Eye className="w-4 h-4 text-stone-500" />
                <span>Read Count:</span>
                <strong className="font-mono-num text-stone-900">{post.viewsCount}</strong>
              </div>
            </div>

            {/* Share Section: Only allows setting a Home Page Story of this post with custom duration */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-stone-700">
                <Clock className="w-3.5 h-3.5 text-amber-800" />
                <label htmlFor="story-duration-select" className="font-medium">
                  Story Duration:
                </label>
                <select
                  id="story-duration-select"
                  value={storyDuration}
                  onChange={(e) => setStoryDuration(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-mono-num bg-[#FBF9F5] border border-stone-300 rounded-lg text-stone-900"
                >
                  <option value={15}>15 Seconds</option>
                  <option value={30}>30 Seconds</option>
                  <option value={60}>60 Seconds</option>
                  <option value={86400}>24 Hours</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleSetStory}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-800 rounded-lg hover:bg-amber-900 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.shareToStory}</span>
              </button>
            </div>
          </div>

          {storySharedBanner && (
            <div
              dir="ltr"
              className="mt-3 px-4 py-2.5 rounded-lg bg-emerald-900/10 border border-emerald-800/30 text-xs text-emerald-900 font-medium"
            >
              Added "{post.title}" to the Home Page Story reel for{' '}
              {storyDuration >= 3600 ? '24 hours' : `${storyDuration} seconds`}.
            </div>
          )}

          {/* Comments Section */}
          <div dir="ltr" className="mt-10 pt-8 border-t border-stone-200">
            <h2 className="text-xl font-display font-semibold text-stone-900 mb-4">
              {t.commentsLabel} (<span className="font-mono-num">{comments.length}</span>)
            </h2>

            <form onSubmit={handleCommentSubmit} className="flex gap-3 mb-6">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a thoughtful literary response..."
                aria-label="Write a comment"
                className="flex-1 px-4 py-2.5 text-sm bg-white border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:border-amber-800"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Comment</span>
              </button>
            </form>

            {comments.length === 0 ? (
              <p className="text-xs text-stone-500 italic">
                No reader annotations yet. Be the first to respond to this work.
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-white border border-stone-200/80"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img
                          src={c.authorPhoto}
                          alt={c.authorName}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-semibold text-stone-900">
                          {c.authorName}
                        </span>
                        {c.authorVerified && <BlueTickBadge size={13} />}
                      </div>
                      <span className="text-[11px] text-stone-400 font-mono-num">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>
    </div>
  );
};
