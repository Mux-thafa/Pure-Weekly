import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Pause, Play, BookOpen, Clock } from 'lucide-react';
import type { LanguageCode, StoryItem } from '../utils/editorialLogic';
import { UI_TRANSLATIONS, formatLanguageLabel, formatSectionLabel } from '../data/seedCatalog';
import { BlueTickBadge } from './BlueTickBadge';

interface StoryCarouselAndModalProps {
  stories: StoryItem[];
  activeLanguage: LanguageCode;
  onOpenPostById: (postId: string) => void;
}

export const StoryCarouselAndModal: React.FC<StoryCarouselAndModalProps> = ({
  stories,
  activeLanguage,
  onOpenPostById
}) => {
  const t = UI_TRANSLATIONS[activeLanguage] || UI_TRANSLATIONS.en;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [seenIds, setSeenIds] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  const activeStory = activeIndex !== null ? stories[activeIndex] : null;

  useEffect(() => {
    if (activeIndex === null || !activeStory || isPaused) return;

    // Cap interactive playback duration to between 5s and 30s for visual progress bar
    const effectiveSeconds = Math.max(5, Math.min(30, activeStory.durationSeconds || 15));
    const intervalMs = 50;
    const step = (intervalMs / (effectiveSeconds * 1000)) * 100;

    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          if (activeIndex < stories.length - 1) {
            const nextIdx = activeIndex + 1;
            setSeenIds((s) => ({ ...s, [stories[nextIdx].id]: true }));
            setActiveIndex(nextIdx);
            return 0;
          } else {
            setActiveIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [activeIndex, activeStory, isPaused, stories]);

  const openStoryAt = (idx: number) => {
    const item = stories[idx];
    if (!item) return;
    setSeenIds((prev) => ({ ...prev, [item.id]: true }));
    setProgress(0);
    setIsPaused(false);
    setActiveIndex(idx);
  };

  const goPrevStory = () => {
    if (activeIndex === null) return;
    if (activeIndex > 0) {
      openStoryAt(activeIndex - 1);
    } else {
      setProgress(0);
    }
  };

  const goNextStory = () => {
    if (activeIndex === null) return;
    if (activeIndex < stories.length - 1) {
      openStoryAt(activeIndex + 1);
    } else {
      setActiveIndex(null);
    }
  };

  const scrollStrip = (dir: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const delta = dir === 'left' ? -320 : 320;
    scrollContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const formatDurationTag = (sec: number) => {
    if (sec >= 3600) return `${Math.round(sec / 3600)}h`;
    return `${sec}s`;
  };

  if (stories.length === 0) return null;

  return (
    <section
      aria-label="Literary Stories and Status"
      className="border-b border-stone-200 bg-[#F7F4EE]"
    >
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-stone-900">
              {t.storiesHeader}
            </h2>
            <p className="text-xs text-stone-600">{t.storiesSub}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollStrip('left')}
              aria-label="Swipe stories left"
              className="p-2 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollStrip('right')}
              aria-label="Swipe stories right"
              className="p-2 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 scroll-smooth"
        >
          {stories.map((story, idx) => {
            const isSeen = Boolean(seenIds[story.id]);
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => openStoryAt(idx)}
                className="overscale-card group flex items-center gap-3.5 min-w-[270px] max-w-[300px] p-3 rounded-xl bg-[#FBF9F5] border border-stone-200/90 text-left shrink-0 hover:border-amber-800/40"
              >
                {/* Instagram/WhatsApp Status Ring */}
                <div
                  className={`p-0.5 rounded-full shrink-0 ${
                    isSeen
                      ? 'bg-stone-300'
                      : 'bg-gradient-to-tr from-amber-700 via-rose-700 to-emerald-700'
                  }`}
                >
                  <div className="p-0.5 bg-[#FBF9F5] rounded-full">
                    <img
                      src={story.authorPhoto}
                      alt={story.authorName}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-stone-900 truncate">
                      {story.authorName}
                    </span>
                    {story.authorVerified && <BlueTickBadge size={14} />}
                  </div>
                  <p className="text-sm font-display font-semibold text-stone-800 truncate mt-0.5">
                    {story.postTitle}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
                    <span>{formatSectionLabel(story.postSection, activeLanguage)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num">{formatDurationTag(story.durationSeconds)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Instagram / WhatsApp Status Viewer Modal */}
      {activeStory && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Story: ${activeStory.postTitle}`}
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const diff = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            if (diff < -40) goNextStory();
            if (diff > 40) goPrevStory();
            touchStartX.current = null;
          }}
        >
          <div className="relative w-full max-w-md bg-stone-900 text-stone-100 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
            {/* Segmented WhatsApp/Instagram Top Progress Bars */}
            <div className="flex items-center gap-1.5 px-4 pt-3">
              {stories.map((st, idx) => {
                let barWidth = '0%';
                if (idx < activeIndex) barWidth = '100%';
                else if (idx === activeIndex) barWidth = `${ Math.min(100, progress) }%`;
                return (
                  <div
                    key={st.id}
                    className="h-1 flex-1 bg-stone-700 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-amber-400 transition-all duration-75"
                      style={{ width: barWidth }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Story Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={activeStory.authorPhoto}
                  alt={activeStory.authorName}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-amber-500/50"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-stone-100 truncate">
                      {activeStory.authorName}
                    </span>
                    {activeStory.authorVerified && <BlueTickBadge size={14} />}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-400">
                    <span>{formatLanguageLabel(activeStory.postLanguage)}</span>
                    <span aria-hidden="true">·</span>
                    <Clock className="w-3 h-3" />
                    <span className="font-mono-num">
                      {formatDurationTag(activeStory.durationSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPaused((p) => !p)}
                  aria-label={isPaused ? 'Resume story' : 'Pause story'}
                  className="p-2 rounded-lg text-stone-300 hover:bg-stone-800 transition-colors"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  aria-label="Close story viewer"
                  className="p-2 rounded-lg text-stone-300 hover:bg-stone-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Story Visual & Excerpt */}
            <div className="relative">
              <img
                src={activeStory.coverUrl}
                alt={activeStory.postTitle}
                referrerPolicy="no-referrer"
                className="w-full h-56 object-cover"
              />
              <div className="p-6 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950">
                <div className="text-xs text-amber-400 mb-1">
                  {formatSectionLabel(activeStory.postSection, activeLanguage)}
                </div>
                <h3 className="text-2xl font-display font-semibold text-white mb-3">
                  {activeStory.postTitle}
                </h3>
                <p className="text-sm font-prose text-stone-300 leading-relaxed mb-6">
                  {activeStory.excerpt}
                </p>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={goPrevStory}
                    aria-label="Previous story"
                    className="px-3 py-2 text-xs font-medium text-stone-300 bg-stone-800 rounded-lg hover:bg-stone-700 transition-colors whitespace-nowrap"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = activeStory.postId;
                      setActiveIndex(null);
                      onOpenPostById(targetId);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t.readFullArticle}</span>
                  </button>

                  <button
                    type="button"
                    onClick={goNextStory}
                    aria-label="Next story"
                    className="px-3 py-2 text-xs font-medium text-stone-300 bg-stone-800 rounded-lg hover:bg-stone-700 transition-colors whitespace-nowrap"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
