import type {
  LanguageCode,
  LiteraryPost,
  LiterarySection,
  NotificationItem,
  PostComment,
  StoryItem,
  UserProfile,
  DirectMessage
} from '../utils/editorialLogic';

export function makeEditorialArtSvg(
  title: string,
  subtitle: string,
  bgHex: string,
  accentHex: string,
  motif: 'arch' | 'waves' | 'astrolabe' | 'manuscript' | 'cypress' | 'lantern'
): string {
  const motifPaths: Record<string, string> = {
    arch: `<path d="M220 380 V200 A180 180 0 0 1 580 200 V380" fill="none" stroke="${accentHex}" stroke-width="2.5" opacity="0.55"/><circle cx="400" cy="185" r="46" fill="${accentHex}" opacity="0.22"/>`,
    waves: `<path d="M80 280 Q240 220 400 280 T720 280 M80 330 Q240 270 400 330 T720 330 M80 380 Q240 320 400 380 T720 380" fill="none" stroke="${accentHex}" stroke-width="2.5" opacity="0.5"/>`,
    astrolabe: `<circle cx="400" cy="240" r="110" fill="none" stroke="${accentHex}" stroke-width="2" opacity="0.5"/><circle cx="400" cy="240" r="72" fill="none" stroke="${accentHex}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/><line x1="260" y1="240" x2="540" y2="240" stroke="${accentHex}" stroke-width="1.2" opacity="0.4"/>`,
    manuscript: `<rect x="230" y="95" width="340" height="290" fill="none" stroke="${accentHex}" stroke-width="2" opacity="0.45"/><line x1="270" y1="155" x2="530" y2="155" stroke="${accentHex}" stroke-width="2" opacity="0.4"/><line x1="270" y1="195" x2="500" y2="195" stroke="${accentHex}" stroke-width="1.5" opacity="0.35"/><line x1="270" y1="235" x2="520" y2="235" stroke="${accentHex}" stroke-width="1.5" opacity="0.35"/>`,
    cypress: `<path d="M400 90 C445 175 450 275 400 355 C350 275 355 175 400 90 Z" fill="${accentHex}" opacity="0.25" stroke="${accentHex}" stroke-width="2"/>`,
    lantern: `<polygon points="400,95 465,165 440,315 360,315 335,165" fill="none" stroke="${accentHex}" stroke-width="2.2" opacity="0.55"/><circle cx="400" cy="215" r="28" fill="${accentHex}" opacity="0.28"/>`
  };

  const safeTitle = title.replace(/[<>&"']/g, '').slice(0, 38);
  const safeSub = subtitle.replace(/[<>&"']/g, '').slice(0, 52);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
    <rect width="800" height="520" fill="${bgHex}"/>
    <rect x="28" y="28" width="744" height="464" fill="none" stroke="${accentHex}" stroke-width="1" opacity="0.35"/>
    <rect x="40" y="40" width="720" height="440" fill="none" stroke="${accentHex}" stroke-width="0.75" opacity="0.2"/>
    ${motifPaths[motif] || motifPaths.arch}
    <text x="400" y="425" text-anchor="middle" fill="#FBF9F5" font-family="Georgia, serif" font-size="24" font-weight="600" opacity="0.92">${safeTitle}</text>
    <text x="400" y="455" text-anchor="middle" fill="${accentHex}" font-family="sans-serif" font-size="12" letter-spacing="3" opacity="0.85">${safeSub.toUpperCase()}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function makeAvatarSvg(initials: string, bgHex: string, fgHex = '#FBF9F5'): string {
  const clean = initials.replace(/[<>&"']/g, '').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <rect width="120" height="120" rx="60" fill="${bgHex}"/>
    <circle cx="60" cy="60" r="54" fill="none" stroke="${fgHex}" stroke-width="1.5" opacity="0.3"/>
    <text x="60" y="70" text-anchor="middle" fill="${fgHex}" font-family="Georgia, serif" font-size="38" font-weight="600">${clean}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface TranslationStrings {
  brandTitle: string;
  navHome: string;
  navLanguages: string;
  navSubmit: string;
  navAbout: string;
  navDashboard: string;
  navMessages: string;
  writeOnSafwaTitle: string;
  writeOnSafwaSub: string;
  writeOnSafwaCta: string;
  storiesHeader: string;
  storiesSub: string;
  latestArticles: string;
  trendingPoems: string;
  thisWeeksFiction: string;
  allLanguagesLabel: string;
  langEnglish: string;
  langArabic: string;
  langMalayalam: string;
  secAll: string;
  secFiction: string;
  secPoetry: string;
  secNonFiction: string;
  readFullArticle: string;
  viewsLabel: string;
  likesLabel: string;
  commentsLabel: string;
  shareToStory: string;
  followAuthor: string;
  followingAuthor: string;
  messageAuthor: string;
  submitPageTitle: string;
  submitPageSub: string;
  aboutPageTitle: string;
  aboutPageSub: string;
}

export const UI_TRANSLATIONS: Record<LanguageCode, TranslationStrings> = {
  en: {
    brandTitle: 'Safwa Publishers',
    navHome: 'Home',
    navLanguages: 'Languages',
    navSubmit: 'Submit',
    navAbout: 'About',
    navDashboard: 'Dashboard',
    navMessages: 'Messages',
    writeOnSafwaTitle: 'Write on Safwa Publishers',
    writeOnSafwaSub:
      'Submit original Fiction, Poetry, and Non-Fiction in Arabic, Malayalam, or English. Every manuscript passes through our AI Authenticity Guard and Chief Editor review.',
    writeOnSafwaCta: 'Begin Manuscript Submission',
    storiesHeader: 'Literary Stories & Status',
    storiesSub: 'Swipe through ephemeral excerpts shared by verified authors and readers',
    latestArticles: 'Latest Articles & Non-Fiction',
    trendingPoems: 'Trending Poems',
    thisWeeksFiction: "This Week's Fiction",
    allLanguagesLabel: 'All Editions',
    langEnglish: 'English',
    langArabic: 'Arabic (العربية)',
    langMalayalam: 'Malayalam (മലയാളം)',
    secAll: 'All Sections',
    secFiction: 'Fiction',
    secPoetry: 'Poetry',
    secNonFiction: 'Non-Fiction',
    readFullArticle: 'Read Full Work',
    viewsLabel: 'Views',
    likesLabel: 'Likes',
    commentsLabel: 'Comments',
    shareToStory: 'Set as Home Story',
    followAuthor: 'Follow',
    followingAuthor: 'Following',
    messageAuthor: 'Message',
    submitPageTitle: 'Editorial Submission Desk',
    submitPageSub:
      'Select your language and literary section, attach your manuscript and cover artwork by upload or drag-and-paste, and run the automatic AI Authenticity Check before sending to the Chief Editor.',
    aboutPageTitle: 'About Safwa Publishers',
    aboutPageSub:
      'An independent trilingual literary house uniting contemporary Arabic, Malayalam, and English letters.'
  },
  ar: {
    brandTitle: 'دار صفوة للنشر',
    navHome: 'الرئيسية',
    navLanguages: 'اللغات',
    navSubmit: 'إرسال عمل',
    navAbout: 'عن الدار',
    navDashboard: 'لوحة الحساب',
    navMessages: 'الرسائل',
    writeOnSafwaTitle: 'اكتب في دار صفوة للنشر',
    writeOnSafwaSub:
      'أرسل أعمالك الأدبية في القصة والشعر والمقال باللغات العربية والمالايالامية والإنجليزية مع فحص الذكاء الاصطناعي التلقائي واعتماد رئيس التحرير.',
    writeOnSafwaCta: 'ابدأ إرسال مخطوطتك الآن',
    storiesHeader: 'قصص وحالات أدبية',
    storiesSub: 'تصفح مقتطفات الكتاب الموثقين بأسلوب القصص التفاعلية',
    latestArticles: 'أحدث المقالات والنصوص غير الخيالية',
    trendingPoems: 'قصائد رائجة',
    thisWeeksFiction: 'سرديات وقصص هذا الأسبوع',
    allLanguagesLabel: 'جميع اللغات',
    langEnglish: 'الإنجليزية (English)',
    langArabic: 'العربية',
    langMalayalam: 'المالايالامية (മലയാളം)',
    secAll: 'كل الأقسام',
    secFiction: 'القصة والرواية',
    secPoetry: 'الشعر',
    secNonFiction: 'المقال والفكر',
    readFullArticle: 'اقرأ النص الكامل',
    viewsLabel: 'مشاهدة',
    likesLabel: 'إعجاب',
    commentsLabel: 'تعليق',
    shareToStory: 'إضافة إلى القصص',
    followAuthor: 'متابعة',
    followingAuthor: 'متابَع',
    messageAuthor: 'مراسلة',
    submitPageTitle: 'مكتب استقبال المخطوطات',
    submitPageSub:
      'اختر اللغة والقسم الأدبي، وأرفق صورتك وغلاف العمل بالسحب أو اللصق المباشر، مع فحص نسبة الذكاء الاصطناعي قبل الإرسال للحساب الرئيسي.',
    aboutPageTitle: 'عن دار صفوة للنشر',
    aboutPageSub: 'منصة أدبية ثلاثية اللغات تجمع الأدب العربي والمالايالامي والإنجليزي في فضاء تحريري موثق.'
  },
  ml: {
    brandTitle: 'സഫ്‌വ പബ്ലിഷേഴ്സ്',
    navHome: 'ഹോം',
    navLanguages: 'ഭാഷകൾ',
    navSubmit: 'രചനകൾ അയക്കുക',
    navAbout: 'ഞങ്ങളെക്കുറിച്ച്',
    navDashboard: 'ഡാഷ്‌ബോർഡ്',
    navMessages: 'സന്ദേശങ്ങൾ',
    writeOnSafwaTitle: 'സഫ്‌വ പബ്ലിഷേഴ്സിൽ എഴുതൂ',
    writeOnSafwaSub:
      'മലയാളം, അറബിക്, ഇംഗ്ലീഷ് ഭാഷകളിൽ കഥ, കവിത, ലേഖനങ്ങൾ എന്നിവ സമർപ്പിക്കാം. ഓട്ടോമാറ്റിക് AI പരിശോധനയിലൂടെ എഡിറ്റോറിയൽ അംഗീകാരം.',
    writeOnSafwaCta: 'പുതിയ രചന സമർപ്പിക്കുക',
    storiesHeader: 'സാഹിത്യ സ്റ്റോറികൾ',
    storiesSub: 'എഴുത്തുകാരുടെ പുതിയ വിശേഷങ്ങളും വരികളും സ്വൈപ്പ് ചെയ്ത് വായിക്കാം',
    latestArticles: 'പുതിയ ലേഖനങ്ങൾ (Non-Fiction)',
    trendingPoems: 'തിരഞ്ഞെടുത്ത കവിതകൾ (Poetry)',
    thisWeeksFiction: 'ഈ ആഴ്ചയിലെ കഥകൾ (Fiction)',
    allLanguagesLabel: 'എല്ലാ ഭാഷകളും',
    langEnglish: 'ഇംഗ്ലീഷ് (English)',
    langArabic: 'അറബിക് (العربية)',
    langMalayalam: 'മലയാളം',
    secAll: 'എല്ലാ വിഭാഗങ്ങളും',
    secFiction: 'കഥ / നോവൽ',
    secPoetry: 'കവിത',
    secNonFiction: 'ലേഖനം / പഠനം',
    readFullArticle: 'പൂർണ്ണരൂപം വായിക്കുക',
    viewsLabel: 'വായനകൾ',
    likesLabel: 'ഇഷ്ടങ്ങൾ',
    commentsLabel: 'അഭിപ്രായങ്ങൾ',
    shareToStory: 'സ്റ്റോറിയായി ചേർക്കുക',
    followAuthor: 'പിന്തുടരുക',
    followingAuthor: 'പിന്തുടരുന്നു',
    messageAuthor: 'സന്ദേശം അയക്കുക',
    submitPageTitle: 'രചനകൾ സമർപ്പിക്കാനുള്ള പേജ്',
    submitPageSub:
      'ഭാഷയും വിഭാഗവും തിരഞ്ഞെടുത്ത് ചിത്രവും രചനയും അപ്‌ലോഡ് ചെയ്യുക അല്ലെങ്കിൽ ഡ്രാഗ് & പേസ്റ്റ് ചെയ്യുക. AI ശതമാനം പരിശോധിച്ച് എഡിറ്റർക്ക് അയക്കാം.',
    aboutPageTitle: 'സഫ്‌വ പബ്ലിഷേഴ്സിനെക്കുറിച്ച്',
    aboutPageSub: 'മലയാളം, അറബിക്, ഇംഗ്ലീഷ് സാഹിത്യങ്ങളെ ഒന്നിപ്പിക്കുന്ന ആധുനിക ഡിജിറ്റൽ പ്രസാധന വേദി.'
  }
};

export const SEED_USERS: UserProfile[] = [
  {
    uid: 'safwa_official_account',
    name: 'Safwa Publishers Official',
    username: 'safwapublishers',
    email: 'mohammedmusthafac3@gmail.com',
    bio: 'Official Editorial Desk & Administration of Safwa Publishers. Curating verified Arabic, Malayalam, and English literature.',
    photoUrl: '/assets/aistudio/image_8895db7c.png',
    isVerified: true,
    role: 'admin',
    visibility: 'public',
    followersCount: 0,
    followingCount: 0,
    createdAt: '2026-01-10T09:00:00.000Z',
    updatedAt: '2026-10-30T09:00:00.000Z'
  }
];

export const SEED_POSTS: LiteraryPost[] = [];

export const SEED_STORIES: StoryItem[] = [];

export const SEED_COMMENTS: Record<string, PostComment[]> = {};

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_welcome',
    targetUserId: 'all',
    actorId: 'safwa_official_account',
    actorName: 'Safwa Publishers Official',
    type: 'published',
    title: 'Welcome to Safwa Publishers. Trilingual Submission Desk is now active.',
    postId: '',
    createdAt: '2026-10-30T08:30:00.000Z'
  }
];

export const SEED_MESSAGES: DirectMessage[] = [];

export function formatLanguageLabel(lang: LanguageCode): string {
  if (lang === 'ar') return 'Arabic · العربية';
  if (lang === 'ml') return 'Malayalam · മലയാളം';
  return 'English';
}

export function formatSectionLabel(sec: LiterarySection, lang: LanguageCode = 'en'): string {
  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;
  if (sec === 'fiction') return t.secFiction;
  if (sec === 'poetry') return t.secPoetry;
  return t.secNonFiction;
}
