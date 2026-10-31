import React from 'react';
import { BookOpen, ShieldCheck, Globe2, MessageSquare, Sparkles } from 'lucide-react';
import type { LanguageCode, UserProfile } from '../utils/editorialLogic';
import { UI_TRANSLATIONS } from '../data/seedCatalog';
import { BlueTickBadge } from './BlueTickBadge';

interface AboutViewProps {
  activeLanguage: LanguageCode;
  officialAccount: UserProfile;
  onNavigateSubmit: () => void;
  onOpenDirectMessage: (uid: string, name: string, photo: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  activeLanguage,
  officialAccount,
  onNavigateSubmit,
  onOpenDirectMessage
}) => {
  const t = UI_TRANSLATIONS[activeLanguage] || UI_TRANSLATIONS.en;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <section className="border-b border-stone-200 pb-10">
        <p className="text-xs uppercase tracking-widest text-amber-800 font-semibold mb-2">
          Safwa Publishers · Trilingual Literary House
        </p>
        <h1 className="text-4xl md:text-5xl font-display font-bold text-stone-900 leading-tight">
          {t.aboutPageTitle}
        </h1>
        <p className="text-lg font-prose text-stone-700 mt-4 max-w-3xl leading-relaxed">
          {t.aboutPageSub}
        </p>
      </section>

      {/* Official Account Card with Real Blue Tick */}
      <section className="p-8 rounded-2xl bg-[#F3EFE6] border border-stone-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={officialAccount.photoUrl}
            alt={officialAccount.name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border-2 border-amber-800"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl font-display font-bold text-stone-900">
                {officialAccount.name}
              </h2>
              <BlueTickBadge size={18} />
            </div>
            <p className="text-xs text-stone-600 mt-0.5">
              @{officialAccount.username} · Main Official Editorial Account
            </p>
            <p className="text-sm text-stone-700 mt-2 max-w-xl">
              {officialAccount.bio}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              onOpenDirectMessage(
                officialAccount.uid,
                officialAccount.name,
                officialAccount.photoUrl
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Editorial Desk</span>
          </button>

          <button
            type="button"
            onClick={onNavigateSubmit}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-xl hover:bg-stone-800 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.writeOnSafwaCta}</span>
          </button>
        </div>
      </section>

      {/* Core Editorial Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
          <Globe2 className="w-5 h-5 text-amber-800" />
          <h3 className="text-xl font-display font-bold text-stone-900">
            01. Arabic, Malayalam & English Editions
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Switch the entire publication between Arabic, Malayalam, and English to read Fiction,
            Poetry, and Non-Fiction in their native script and typographic cadence.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
          <Sparkles className="w-5 h-5 text-amber-800" />
          <h3 className="text-xl font-display font-bold text-stone-900">
            02. Automatic AI Authenticity Guard
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Every submitted manuscript is evaluated for synthetic AI percentage before reaching the
            Chief Editor, ensuring human literary craftsmanship.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 space-y-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-800" />
          <h3 className="text-xl font-display font-bold text-stone-900">
            03. Verified Blue Tick & Homepage Stories
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Verified authors receive the official Blue Tick badge, share timed excerpts to the
            Homepage Story strip, and connect with readers via Instagram-style Direct Messaging.
          </p>
        </div>
      </section>
    </div>
  );
};
