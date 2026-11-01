import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  Heart,
  Eye,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import type { LiteraryPost, LanguageCode } from '../utils/editorialLogic';
import { ThreeLiteraryScene } from './ThreeLiteraryScene';

export interface ShowcaseSlide {
  id: string;
  categoryBadge: string;
  audienceBadge: string;
  readTime: string;
  title: string;
  quoteExcerpt: string;
  authorName: string;
  authorSubtitle: string;
  authorInitial: string;
  authorAvatarBg: string;
  likesCount: number;
  viewsCount: number;
  language: LanguageCode;
  fullPost: LiteraryPost;
}

interface FeaturedShowcaseHeroProps {
  publishedPosts: LiteraryPost[];
  activeLanguage: LanguageCode;
  onOpenPost: (post: LiteraryPost) => void;
  onLikePost?: (postId: string) => void;
}

const DEFAULT_SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: 'showcase_price_of_love',
    categoryBadge: 'FEATURED POETRY',
    audienceBadge: '0 yrs + Kids',
    readTime: '1 MIN READ',
    title: 'The Price of Love',
    quoteExcerpt: '"I told the moon all mine, all that was true in me. This is not a game......."',
    authorName: 'Muhammed Hashir',
    authorSubtitle: 'CURATED WRITER',
    authorInitial: 'M',
    authorAvatarBg: 'bg-blue-600',
    likesCount: 2,
    viewsCount: 68,
    language: 'en',
    fullPost: {
      id: 'showcase_price_of_love',
      authorId: 'safwa_official_account',
      authorName: 'Muhammed Hashir',
      authorUsername: 'muhammed_hashir',
      authorPhoto: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%232563EB"/><text x="50" y="62" font-size="36" font-family="sans-serif" font-weight="bold" fill="%23FFFFFF" text-anchor="middle">M</text></svg>',
      authorVerified: true,
      language: 'en',
      section: 'poetry',
      title: 'The Price of Love',
      subtitle: 'A meditation on devotion, stillness, and the fragile truth held in midnight hours.',
      content: `I told the moon all mine, all that was true in me. This is not a game of shadow and light, but a silent oath written in sleepless skies.\n\nWhere words falter, memory breathes, and what we gave away was never lost—only transformed into dawn. Love demands no victory, only the quiet courage to remain steadfast when the wind tests every branch.\n\nEvery tear that traced the silence was a tribute to what mattered, unbound by fear or fleeting desire. We measure eternity not in seasons, but in the sincerity of each unuttered prayer.`,
      coverUrl: '/assets/aistudio/image_b0e18af4.png',
      aiScore: 4,
      aiVerdict: 'Authentic human lyrical cadence with deeply felt evocative rhythm.',
      status: 'published',
      viewsCount: 68,
      likesCount: 2,
      commentsCount: 1,
      createdAt: '2026-10-31T10:00:00.000Z',
      updatedAt: '2026-10-31T10:00:00.000Z'
    }
  },
  {
    id: 'showcase_andalusian_echoes',
    categoryBadge: 'FEATURED ESSAY',
    audienceBadge: 'الأدب والفكر',
    readTime: '3 MIN READ',
    title: 'أندلسيات العصر الجديد (Andalusian Echoes)',
    quoteExcerpt: '"بين ظلال الحمراء وقرطبة، تظل الكلمة جسراً لا ينكسر بين الذاكرة والخلود......."',
    authorName: 'Safwa Editorial',
    authorSubtitle: 'EDITORIAL SELECTION',
    authorInitial: 'س',
    authorAvatarBg: 'bg-emerald-600',
    likesCount: 14,
    viewsCount: 182,
    language: 'ar',
    fullPost: {
      id: 'showcase_andalusian_echoes',
      authorId: 'safwa_official_account',
      authorName: 'Safwa Publishers Editorial',
      authorUsername: 'safwapublishers',
      authorPhoto: '/assets/aistudio/image_8895db7c.png',
      authorVerified: true,
      language: 'ar',
      section: 'non-fiction',
      title: 'أندلسيات العصر الجديد (Andalusian Echoes)',
      subtitle: 'دراسة في أثر المخطوطات القرطبية في بعث الوجدان الأدبي المعاصر وتأصيل الأصالة.',
      content: `بين ظلال الحمراء وقرطبة، تظل الكلمة جسراً لا ينكسر بين الذاكرة والخلود.\n\nفي هذا الأرشيف المتجدد، نلتقي عند مفترق الطرق الأدبية لنقرأ التاريخ برؤية حديثة وبلاغة معاصرة تعيد للشعر والبيان مكانتهما الأولى في الضمير الإنساني.\n\nإن سحر الحرف العربي لا يكمن فقط في موسيقاه الظاهرة، بل في قدرته على حمل نبض القرون دون أن يشيخ، ليكون دوماً صوتاً للعدالة والجمال.`,
      coverUrl: '/assets/aistudio/image_b0e18af4.png',
      aiScore: 2,
      aiVerdict: 'نص أدبي أصيل بلغة رصينة ومجازات شعرية رفيعة المستوى.',
      status: 'published',
      viewsCount: 182,
      likesCount: 14,
      commentsCount: 3,
      createdAt: '2026-10-30T14:00:00.000Z',
      updatedAt: '2026-10-30T14:00:00.000Z'
    }
  },
  {
    id: 'showcase_coastal_chronicle',
    categoryBadge: 'FEATURED FICTION',
    audienceBadge: 'മലയാള സാഹിത്യം',
    readTime: '2 MIN READ',
    title: 'തീരദേശത്തിന്റെ ഓർമ്മപ്പുസ്തകം (Coastal Chronicle)',
    quoteExcerpt: '"കടൽക്കാറ്റിൽ അലിഞ്ഞുപോയ പഴയ തുറമുഖത്തിന്റെ കിനാവുകൾ ഇന്നും ഓർമ്മകളിൽ തിരമാലയായി അലയടിക്കുന്നു......."',
    authorName: 'Safwa Editorial',
    authorSubtitle: 'EDITORIAL SELECTION',
    authorInitial: 'സ',
    authorAvatarBg: 'bg-amber-600',
    likesCount: 9,
    viewsCount: 115,
    language: 'ml',
    fullPost: {
      id: 'showcase_coastal_chronicle',
      authorId: 'safwa_official_account',
      authorName: 'Safwa Publishers Editorial',
      authorUsername: 'safwapublishers',
      authorPhoto: '/assets/aistudio/image_8895db7c.png',
      authorVerified: true,
      language: 'ml',
      section: 'fiction',
      title: 'തീരദേശത്തിന്റെ ഓർമ്മപ്പുസ്തകം (Coastal Chronicle)',
      subtitle: 'മലബാർ തുറമുഖങ്ങളുടെ നനുത്ത മഴയോർമ്മകളും വേലിയേറ്റത്തിന്റെ ഗൃഹാതുരത്വവും.',
      content: `കടൽക്കാറ്റിൽ അലിഞ്ഞുപോയ പഴയ തുറമുഖത്തിന്റെ കിനാവുകൾ ഇന്നും ഓർമ്മകളിൽ തിരമാലയായി അലയടിക്കുന്നു.\n\nകാലം ബാക്കിവെച്ച ചെറുവെളിച്ചങ്ങളിൽ നിന്നും പുതിയൊരധ്യായം തുറക്കുകയാണ് സഫ്‌വ പബ്ലിഷേഴ്സ്. തിരമാലകൾ തീരത്തെ തഴുകിപ്പോകുന്ന ഓരോ നിമിഷത്തിലും നൂറ്റാണ്ടുകളുടെ കഥകളുറങ്ങുന്നുണ്ട്.\n\nതുറമുഖത്തെ പഴയ ചായക്കടകളിലെ സന്ധ്യാകൂട്ടായ്മകളും, ചരക്കുകപ്പലുകൾ കൊണ്ടുവന്ന വിദേശ ഭാഷകളുടെ സുഗന്ധവും ഇന്നത്തെ തലമുറയ്ക്കായി ഹൃദയസ്പർശിയായി രേഖപ്പെടുത്തപ്പെടുന്നു.`,
      coverUrl: '/assets/aistudio/image_b0e18af4.png',
      aiScore: 1,
      aiVerdict: 'ഉയർന്ന നിലവാരമുള്ള നാടൻ ഭാഷാപ്രയോഗങ്ങളും മനുഷ്യജീവിതത്തിന്റെ ആഴവും പ്രതിഫലിക്കുന്നു.',
      status: 'published',
      viewsCount: 115,
      likesCount: 9,
      commentsCount: 2,
      createdAt: '2026-10-29T16:00:00.000Z',
      updatedAt: '2026-10-29T16:00:00.000Z'
    }
  }
];

export const FeaturedShowcaseHero: React.FC<FeaturedShowcaseHeroProps> = ({
  publishedPosts,
  activeLanguage,
  onOpenPost,
  onLikePost
}) => {
  // Combine custom published works with default featured pieces
  const slides: ShowcaseSlide[] = React.useMemo(() => {
    const customSlides: ShowcaseSlide[] = publishedPosts.map((post) => {
      const sectionBadge =
        post.section === 'poetry'
          ? 'FEATURED POETRY'
          : post.section === 'fiction'
            ? 'FEATURED FICTION'
            : 'FEATURED ARTICLE';
      const readMinutes = Math.max(1, Math.ceil((post.content?.length || 200) / 450));
      return {
        id: post.id,
        categoryBadge: sectionBadge,
        audienceBadge: post.language === 'ar' ? 'العربية' : post.language === 'ml' ? 'മലയാളം' : 'All Readers',
        readTime: `${readMinutes} MIN READ`,
        title: post.title,
        quoteExcerpt: post.subtitle ? `"${post.subtitle}"` : `"${post.content.slice(0, 120)}..."`,
        authorName: post.authorName,
        authorSubtitle: 'CURATED WRITER',
        authorInitial: (post.authorName || 'S').charAt(0).toUpperCase(),
        authorAvatarBg: 'bg-cyan-600',
        likesCount: post.likesCount || 0,
        viewsCount: post.viewsCount || 0,
        language: post.language,
        fullPost: post
      };
    });

    // Put matching language slides first, followed by default showcase
    return [...customSlides, ...DEFAULT_SHOWCASE_SLIDES];
  }, [publishedPosts]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [is3DMode, setIs3DMode] = useState(false);

  // Auto-play cycling every 8 seconds unless interacted with
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[currentIndex] || DEFAULT_SHOWCASE_SLIDES[0];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Outer Rounded Container with Moody Dark Aesthetic and Refined Glass Border */}
      <div
        className="group relative w-full rounded-[2.2rem] sm:rounded-[2.75rem] border border-cyan-500/25 bg-[#080D1D] shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden"
        style={{ minHeight: '380px' }}
      >
        {/* Background Layer: Live Three.js WebGL 3D Scene OR Atmospheric 2D Artwork */}
        {is3DMode ? (
          <div className="absolute inset-0 z-0">
            <ThreeLiteraryScene
              initialMode="codex"
              heightClass="h-full"
              showControls={true}
              interactive={true}
            />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src="/assets/aistudio/image_b0e18af4.png"
              alt="Showcase Artwork Background"
              className="w-full h-full object-cover object-center opacity-45 brightness-90 contrast-110 scale-105 group-hover:scale-100 transition-transform duration-1000 ease-out"
            />
            {/* Gradient Overlay for high text legibility and rich tone */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#060914]/95 via-[#090E22]/85 to-[#060914]/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060914] via-transparent to-[#060914]/40" />
          </div>
        )}

        {/* Content Container */}
        <div className={`relative z-10 p-6 sm:p-10 md:p-14 flex flex-col justify-between h-full min-h-[380px] sm:min-h-[430px] ${is3DMode ? 'pointer-events-none' : ''}`}>
          {/* Top Row: Left / Right Navigation & 3D Toggle & Carousel Dashes */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pointer-events-auto">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous slide"
                className="w-10 h-10 rounded-full bg-slate-950/60 border border-white/15 text-white/80 hover:text-white hover:bg-slate-900/90 hover:border-cyan-400/40 hover:scale-105 transition-all flex items-center justify-center backdrop-blur-md shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next slide"
                className="w-10 h-10 rounded-full bg-slate-950/60 border border-white/15 text-white/80 hover:text-white hover:bg-slate-900/90 hover:border-cyan-400/40 hover:scale-105 transition-all flex items-center justify-center backdrop-blur-md shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Three.js 3D Scene Toggle Button */}
              <button
                type="button"
                onClick={() => setIs3DMode(!is3DMode)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-md backdrop-blur-md ${
                  is3DMode
                    ? 'bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-amber-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.6)] border border-cyan-300'
                    : 'bg-slate-950/80 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-300 hover:bg-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span>{is3DMode ? '3D Active · Switch to Artwork' : '✦ Switch to 3D Scene'}</span>
              </button>

              {/* Top Right Carousel Dashes Indicator */}
              <div className="flex items-center gap-1.5" aria-label="Slide indicators">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? 'w-7 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Center Showcase Section: Badges, Big Serif Title, and Excerpt Quote */}
          <div className="space-y-4 max-w-4xl pointer-events-auto">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase text-cyan-200 bg-cyan-950/60 border border-cyan-400/30 backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{activeSlide.categoryBadge}</span>
              </span>

              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-[11px] font-semibold text-slate-300 bg-slate-900/60 border border-white/15 backdrop-blur-md">
                {activeSlide.audienceBadge}
              </span>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-mono font-medium text-slate-300 bg-slate-900/60 border border-white/15 backdrop-blur-md">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{activeSlide.readTime}</span>
              </span>
            </div>

            {/* Headline Title */}
            <h1
              className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white tracking-tight leading-[1.1] drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] cursor-pointer hover:text-cyan-200 transition-colors"
              onClick={() => onOpenPost(activeSlide.fullPost)}
              style={{ textWrap: 'balance' }}
            >
              {activeSlide.title}
            </h1>

            {/* Italic Excerpt Quote */}
            <p className="text-base sm:text-lg font-serif italic text-slate-300/90 leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {activeSlide.quoteExcerpt}
            </p>
          </div>

          {/* Thin Horizontal Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent my-6" />

          {/* Bottom Bar: Curated Writer Info + Stats + Read Story Button */}
          <div className="flex flex-wrap items-center justify-between gap-5 pt-1 pointer-events-auto">
            {/* Writer Info */}
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-full ${activeSlide.authorAvatarBg} text-white font-bold text-sm flex items-center justify-center shadow-[0_0_18px_rgba(37,99,235,0.5)] border-2 border-white/20`}
              >
                {activeSlide.authorInitial}
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                  {activeSlide.authorSubtitle}
                </span>
                <span className="block text-sm sm:text-base font-bold text-white tracking-wide">
                  {activeSlide.authorName}
                </span>
              </div>
            </div>

            {/* Right: Stats & Primary Read Button */}
            <div className="flex items-center gap-5 sm:gap-7">
              {/* Like Counter */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onLikePost) onLikePost(activeSlide.fullPost.id);
                }}
                className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300 hover:text-rose-400 transition-colors group/like"
              >
                <Heart className="w-4 h-4 text-rose-400/80 group-hover/like:text-rose-400 transition-colors" />
                <span className="font-bold">{activeSlide.likesCount}</span>
              </button>

              {/* View Counter */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300">
                <Eye className="w-4 h-4 text-cyan-300/90" />
                <span className="font-bold">{activeSlide.viewsCount}</span>
              </div>

              {/* Prominent White Pill Button */}
              <button
                type="button"
                onClick={() => onOpenPost(activeSlide.fullPost)}
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-white text-slate-900 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 hover:scale-105 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] active:scale-95 transition-all shadow-xl"
              >
                <span>Read Story</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
