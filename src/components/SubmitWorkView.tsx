import React, { useEffect, useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  User as UserIcon,
  Send,
  Save,
  FolderOpen
} from 'lucide-react';
import {
  analyzeManuscriptHeuristics,
  type AiCheckResult,
  type CategoryItem,
  type LanguageCode,
  type LiteraryPost,
  type LiterarySection,
  type UserProfile
} from '../utils/editorialLogic';
import { makeEditorialArtSvg, makeAvatarSvg, UI_TRANSLATIONS } from '../data/seedCatalog';

interface SubmitWorkViewProps {
  currentUser: UserProfile;
  initialLanguage: LanguageCode;
  initialSection: LiterarySection;
  categories?: CategoryItem[];
  editingDraft?: LiteraryPost | null;
  onClearEditingDraft?: () => void;
  onSubmitWork: (
    newPost: Omit<LiteraryPost, 'id'>,
    existingId?: string
  ) => Promise<void>;
  onNavigateDashboard: () => void;
}

export const SubmitWorkView: React.FC<SubmitWorkViewProps> = ({
  currentUser,
  initialLanguage,
  initialSection,
  categories = [],
  editingDraft = null,
  onClearEditingDraft,
  onSubmitWork,
  onNavigateDashboard
}) => {
  const [language, setLanguage] = useState<LanguageCode>(
    editingDraft?.language || initialLanguage
  );
  const [section, setSection] = useState<LiterarySection>(
    editingDraft?.section || initialSection
  );
  const [categoryId, setCategoryId] = useState<string>(editingDraft?.categoryId || '');
  const [title, setTitle] = useState(editingDraft?.title || '');
  const [subtitle, setSubtitle] = useState(editingDraft?.subtitle || '');
  const [authorName, setAuthorName] = useState(
    editingDraft?.authorName || currentUser.name || ''
  );
  const [authorPhoto, setAuthorPhoto] = useState(
    editingDraft?.authorPhoto || currentUser.photoUrl || ''
  );
  const [authorPhotoUrlInput, setAuthorPhotoUrlInput] = useState('');
  const [coverUrl, setCoverUrl] = useState(editingDraft?.coverUrl || '');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [content, setContent] = useState(editingDraft?.content || '');

  const [aiResult, setAiResult] = useState<AiCheckResult | null>(null);
  const [isCheckingAi, setIsCheckingAi] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingAuthor, setIsDraggingAuthor] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState<'pending' | 'draft' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!editingDraft) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage, editingDraft]);

  useEffect(() => {
    if (!editingDraft) {
      setSection(initialSection);
    }
  }, [initialSection, editingDraft]);

  useEffect(() => {
    if (editingDraft) {
      setLanguage(editingDraft.language);
      setSection(editingDraft.section);
      setCategoryId(editingDraft.categoryId || '');
      setTitle(editingDraft.title);
      setSubtitle(editingDraft.subtitle || '');
      setAuthorName(editingDraft.authorName);
      setAuthorPhoto(editingDraft.authorPhoto);
      setCoverUrl(editingDraft.coverUrl);
      setContent(editingDraft.content);
    }
  }, [editingDraft]);

  useEffect(() => {
    if (currentUser.name && !authorName) setAuthorName(currentUser.name);
    if (currentUser.photoUrl && !authorPhoto) setAuthorPhoto(currentUser.photoUrl);
  }, [currentUser, authorName, authorPhoto]);

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS.en;

  const matchingCategories = categories.filter(
    (c) =>
      c.isActive &&
      (c.language === 'all' || c.language === language) &&
      c.section === section
  );

  const readFileAsDataUrl = (file: File, onResult: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select or drop a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
        setErrorMessage('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasteImage = (
    e: React.ClipboardEvent,
    onResult: (dataUrl: string) => void
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          readFileAsDataUrl(file, onResult);
          return;
        }
      }
    }
  };

  const runAiAuthenticityCheck = async (): Promise<AiCheckResult> => {
    if (!content.trim()) {
      const emptyRes = analyzeManuscriptHeuristics('', title);
      setAiResult(emptyRes);
      return emptyRes;
    }

    setIsCheckingAi(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    try {
      const response = await fetch('/api/ai-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          title,
          subtitle,
          content,
          language,
          section
        })
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const localFallback = analyzeManuscriptHeuristics(content, title);
        setAiResult(localFallback);
        return localFallback;
      }
      const data = await response.json();
      const result: AiCheckResult = {
        aiScore: Number(data.aiScore ?? 8),
        aiVerdict: String(data.aiVerdict || 'Analyzed by Safwa AI Authenticity Guard.'),
        signals: Array.isArray(data.signals) ? data.signals : []
      };
      setAiResult(result);
      return result;
    } catch (_err) {
      clearTimeout(timeoutId);
      const localFallback = analyzeManuscriptHeuristics(content, title);
      setAiResult(localFallback);
      return localFallback;
    } finally {
      setIsCheckingAi(false);
    }
  };

  const handleSaveOrSubmit = async (targetStatus: 'pending' | 'draft') => {
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Please enter a title for your literary work.');
      return;
    }
    if (!authorName.trim()) {
      setErrorMessage('Please enter the author name.');
      return;
    }
    if (targetStatus === 'pending' && !content.trim()) {
      setErrorMessage('Please enter or paste your manuscript text before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Instant AI heuristic fallback so submission never blocks or gets stuck!
      const checkedAi =
        aiResult ||
        (content.trim().length > 0
          ? analyzeManuscriptHeuristics(content.trim(), title.trim())
          : { aiScore: 0, aiVerdict: 'Draft saved prior to AI scan.', signals: [] });

      const finalCover =
        coverUrl.trim() ||
        coverUrlInput.trim() ||
        makeEditorialArtSvg(
          title.trim(),
          `${section.toUpperCase()} · ${language.toUpperCase()}`,
          '#1C1917',
          '#D97706',
          section === 'poetry' ? 'arch' : section === 'fiction' ? 'lantern' : 'manuscript'
        );

      const finalAuthorPhoto =
        authorPhoto.trim() ||
        authorPhotoUrlInput.trim() ||
        currentUser.photoUrl ||
        makeAvatarSvg(authorName.trim().slice(0, 2), '#9A3412', '#FBF9F5');

      const now = new Date().toISOString();
      await onSubmitWork(
        {
          authorId: currentUser.uid,
          authorName: authorName.trim(),
          authorUsername: currentUser.username || 'contributor',
          authorPhoto: finalAuthorPhoto,
          authorVerified: currentUser.isVerified,
          language,
          section,
          ...(categoryId ? { categoryId } : {}),
          title: title.trim(),
          subtitle: subtitle.trim(),
          content: content.trim() || '(Draft in progress)',
          coverUrl: finalCover,
          aiScore: checkedAi.aiScore,
          aiVerdict: checkedAi.aiVerdict,
          status: targetStatus,
          viewsCount: editingDraft?.viewsCount || 0,
          likesCount: editingDraft?.likesCount || 0,
          commentsCount: editingDraft?.commentsCount || 0,
          createdAt: editingDraft?.createdAt || now,
          updatedAt: now
        },
        editingDraft?.id
      );

      setSubmittedSuccess(targetStatus);
      if (onClearEditingDraft) onClearEditingDraft();
      setTitle('');
      setSubtitle('');
      setContent('');
      setCoverUrl('');
      setCoverUrlInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveOrSubmit('pending');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-slate-800 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Safwa Publishers · Trilingual Manuscript Desk
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-white">
            {editingDraft ? `Editing Manuscript: ${editingDraft.title}` : (
              <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
                {t.submitPageTitle}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">{t.submitPageSub}</p>
        </div>

        {editingDraft && onClearEditingDraft && (
          <button
            type="button"
            onClick={onClearEditingDraft}
            className="px-4 py-2 text-xs font-bold text-slate-300 bg-[#0D1426] border border-slate-700 rounded-xl hover:text-white hover:border-cyan-400 transition-colors"
          >
            Start Fresh Manuscript
          </button>
        )}
      </div>

      {submittedSuccess && (
        <div
          role="status"
          className="mb-8 p-6 rounded-2xl bg-[#09221B] text-emerald-100 border border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)] flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-display font-bold text-white">
                {submittedSuccess === 'draft'
                  ? 'Manuscript Saved as Private Draft'
                  : 'Manuscript Sent to the Official Safwa Publishers Account'}
              </h2>
              <p className="text-xs text-emerald-200/90 mt-1">
                {submittedSuccess === 'draft'
                  ? 'Your draft is stored privately in your account. You can resume editing or submit it for editorial review at any time from My Submissions.'
                  : `Your work and its AI Authenticity Percentage (${aiResult?.aiScore ?? 12}% AI) have been delivered to the Chief Editor queue for review. Track status in your Dashboard.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateDashboard}
            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-300 text-emerald-950 rounded-xl hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all whitespace-nowrap"
          >
            View in My Submissions & Dashboard
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs font-medium text-rose-200 flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitForm} className="space-y-8">
        {/* Step 1: Select Language, Section & Category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-[#0D1426] border border-slate-800 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2.5">
              01. Select Manuscript Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { code: 'ar', label: 'Arabic' },
                  { code: 'ml', label: 'Malayalam' },
                  { code: 'en', label: 'English' }
                ] as const
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap ${
                    language === item.code
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      : 'bg-[#090D1A] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-fuchsia-400 mb-2.5">
              02. Select Literary Section
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'fiction', label: 'Fiction' },
                  { id: 'poetry', label: 'Poetry' },
                  { id: 'non-fiction', label: 'Non-Fiction' }
                ] as const
              ).map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSection(sec.id)}
                  className={`py-2.5 px-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap ${
                    section === sec.id
                      ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                      : 'bg-[#090D1A] text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="submit-category"
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>03. Editorial Category</span>
            </label>
            <select
              id="submit-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full py-2.5 px-3 text-xs font-medium bg-[#090D1A] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            >
              <option value="">General {section} ({language.toUpperCase()})</option>
              {matchingCategories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#090D1A] text-white">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Title, Optional Subtitle, Author Name & Author Photo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="submit-title"
                className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5"
              >
                Title of Work *
              </label>
              <input
                id="submit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter the title of your poem, story, or essay"
                className="w-full px-4 py-2.5 text-sm bg-[#0D1426] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="submit-subtitle"
                className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
              >
                Subtitle (Optional)
              </label>
              <input
                id="submit-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional deck or epigraph"
                className="w-full px-4 py-2.5 text-sm bg-[#0D1426] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="submit-author-name"
                className="block text-xs font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5"
              >
                Author Full Name *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  id="submit-author-name"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your literary byline"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0D1426] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400 focus:ring-1 focus:ring-fuchsia-400"
                />
              </div>
            </div>
          </div>

          {/* Author Photo Upload / Drag & Paste / URL */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingAuthor(true);
            }}
            onDragLeave={() => setIsDraggingAuthor(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingAuthor(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFileAsDataUrl(file, setAuthorPhoto);
            }}
            onPaste={(e) => handlePasteImage(e, setAuthorPhoto)}
            className={`p-5 rounded-2xl border-2 border-dashed transition-all ${
              isDraggingAuthor
                ? 'border-fuchsia-400 bg-fuchsia-950/30 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
                : 'border-slate-800 bg-[#0D1426]'
            }`}
          >
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Author Portrait Photo (Upload, Drag & Drop, Paste, or URL)
            </label>
            <div className="flex items-center gap-4 mb-3">
              {authorPhoto ? (
                <img
                  src={authorPhoto}
                  alt="Author preview"
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border-2 border-fuchsia-400/60 shadow-[0_0_12px_rgba(217,70,239,0.4)] shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#090D1A] border border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-fuchsia-200 bg-fuchsia-950/60 border border-fuchsia-500/40 rounded-xl cursor-pointer hover:bg-fuchsia-900/60 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload author portrait from device"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) readFileAsDataUrl(file, setAuthorPhoto);
                    }}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Or drag & drop / Ctrl+V paste an image here
                </p>
              </div>
            </div>
            <input
              type="url"
              value={authorPhotoUrlInput}
              onChange={(e) => {
                setAuthorPhotoUrlInput(e.target.value);
                if (e.target.value.trim()) setAuthorPhoto(e.target.value.trim());
              }}
              placeholder="Or paste author image address (https://...)"
              aria-label="Author photo URL"
              className="w-full px-3 py-2 text-xs bg-[#090D1A] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-400"
            />
          </div>
        </div>

        {/* Step 3: Artwork Photo Upload / Drag & Paste + Manuscript Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingCover(true);
            }}
            onDragLeave={() => setIsDraggingCover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingCover(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFileAsDataUrl(file, setCoverUrl);
            }}
            onPaste={(e) => handlePasteImage(e, setCoverUrl)}
            className={`p-5 rounded-2xl border-2 border-dashed flex flex-col justify-between transition-all ${
              isDraggingCover
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                : 'border-slate-800 bg-[#0D1426]'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Article / Poem Cover Photo</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Drag and drop an image, paste directly from clipboard (Ctrl+V), upload from your device, or enter an image URL.
              </p>

              {coverUrl && (
                <img
                  src={coverUrl}
                  alt="Cover artwork preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover rounded-xl border border-cyan-500/30 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                />
              )}

              <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-cyan-200 bg-cyan-950/60 border border-cyan-500/40 rounded-xl cursor-pointer hover:bg-cyan-900/60 transition-colors mb-3">
                <Upload className="w-4 h-4" />
                <span>Choose Cover Image File</span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload cover image file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) readFileAsDataUrl(file, setCoverUrl);
                  }}
                />
              </label>
            </div>

            <input
              type="url"
              value={coverUrlInput}
              onChange={(e) => {
                setCoverUrlInput(e.target.value);
                if (e.target.value.trim()) setCoverUrl(e.target.value.trim());
              }}
              placeholder="Or paste cover image URL (https://...)"
              aria-label="Cover image URL"
              className="w-full px-3 py-2 text-xs bg-[#090D1A] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Manuscript Body Textarea */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="submit-manuscript-text"
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Manuscript Text ({language.toUpperCase()}) *</span>
              </label>
              <button
                type="button"
                onClick={runAiAuthenticityCheck}
                disabled={isCheckingAi}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 rounded-xl hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isCheckingAi ? 'Scanning AI %...' : 'Run Automatic AI Checker'}</span>
              </button>
            </div>

            <textarea
              id="submit-manuscript-text"
              rows={9}
              dir={language === 'ar' ? 'rtl' : 'ltr'}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => {
                if (content.trim().length > 20) {
                  runAiAuthenticityCheck();
                }
              }}
              placeholder="Write or paste your full poem, short story, or non-fiction article here..."
              className="w-full flex-1 p-4 text-base font-prose bg-[#0D1426] border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 leading-relaxed"
            />
          </div>
        </div>

        {/* Automatic AI Checker Report Box + Save Draft / Submit Actions */}
        <div className="p-6 rounded-2xl bg-[#0D1426] border border-slate-800 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">
                Safwa Automatic AI Authenticity Checker
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {aiResult
                ? aiResult.aiVerdict
                : 'Every submission is automatically scanned for synthetic AI phrasing before reaching the Chief Editor.'}
            </p>
            {aiResult && aiResult.signals.length > 0 && (
              <div className="text-[11px] text-cyan-300/80 pt-1 font-mono">
                Signals: {aiResult.signals.join(' · ')}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right mr-3">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Estimated AI Content
              </div>
              <div
                data-testid="submit-ai-percentage"
                className={`text-2xl font-mono font-bold ${
                  (aiResult?.aiScore ?? 0) >= 60 ? 'text-rose-400 text-glow-fuchsia' : 'text-emerald-400 text-glow-emerald'
                }`}
              >
                {aiResult ? `${aiResult.aiScore}% AI` : 'Ready'}
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveOrSubmit('draft')}
              className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-xl hover:bg-amber-900/50 hover:shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all whitespace-nowrap"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save as Draft</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-pink-500 rounded-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all whitespace-nowrap active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit to Official Account'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
