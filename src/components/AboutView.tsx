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
      <section className="border-b border-slate-800 pb-10">
        <p className="text-xs uppercase tracking-widest text-cyan-400 font-bold mb-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Safwa Publishers · Trilingual Literary House
        </p>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white leading-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">
            {t.aboutPageTitle}
          </span>
        </h1>
        <p className="text-lg font-prose text-slate-300 mt-4 max-w-3xl leading-relaxed">
          {t.aboutPageSub}
        </p>
      </section>

      {/* Official Account Card with Real Blue Tick */}
      <section className="p-8 rounded-3xl bg-[#0D1426] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-5 relative z-10">
          <img
            src={officialAccount.photoUrl}
            alt={officialAccount.name}
            referrerPolicy="no-referrer"
            className="w-18 h-18 rounded-full object-cover border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-display font-bold text-white">
                {officialAccount.name}
              </h2>
              <BlueTickBadge size={20} />
            </div>
            <p className="text-xs text-cyan-400 font-mono mt-0.5">
              @{officialAccount.username} · Main Official Editorial Account
            </p>
            <p className="text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              {officialAccount.bio}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() =>
              onOpenDirectMessage(
                officialAccount.uid,
                officialAccount.name,
                officialAccount.photoUrl
              )
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 rounded-xl hover:bg-cyan-900/60 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Message Editorial Desk</span>
          </button>

          <button
            type="button"
            onClick={onNavigateSubmit}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-xl hover:shadow-[0_0_25px_rgba(217,70,239,0.5)] transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>{t.writeOnSafwaCta}</span>
          </button>
        </div>
      </section>

      {/* Core Editorial Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-[#0D1426] border border-slate-800 space-y-3 hover:border-cyan-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Globe2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold text-white">
            01. Arabic, Malayalam & English Editions
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Switch the entire publication between Arabic, Malayalam, and English to read Fiction,
            Poetry, and Non-Fiction in their native script and typographic cadence.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0D1426] border border-slate-800 space-y-3 hover:border-fuchsia-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-950/70 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold text-white">
            02. Automatic AI Authenticity Guard
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every submitted manuscript is evaluated for synthetic AI percentage before reaching the
            Chief Editor, ensuring human literary craftsmanship.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#0D1426] border border-slate-800 space-y-3 hover:border-emerald-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-display font-bold text-white">
            03. Verified Blue Tick & Homepage Stories
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Verified authors receive the official Blue Tick badge, share timed excerpts to the
            Homepage Story strip, and connect with readers via Instagram-style Direct Messaging.
          </p>
        </div>
      </section>
    </div>
  );
};
