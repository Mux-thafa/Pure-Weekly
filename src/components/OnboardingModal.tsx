import React, { useState } from 'react';
import { Upload, Link as LinkIcon, X, Check } from 'lucide-react';
import type { UserProfile } from '../utils/editorialLogic';
import { makeAvatarSvg } from '../data/seedCatalog';

interface OnboardingModalProps {
  isOpen: boolean;
  initialProfile: UserProfile;
  onClose: () => void;
  onSaveProfile: (updated: UserProfile, isNewRegistration: boolean) => Promise<void>;
  isNewRegistration?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  initialProfile,
  onClose,
  onSaveProfile,
  isNewRegistration = false
}) => {
  const [name, setName] = useState(initialProfile.name || '');
  const [username, setUsername] = useState(initialProfile.username || '');
  const [bio, setBio] = useState(initialProfile.bio || '');
  const [photoUrl, setPhotoUrl] = useState(initialProfile.photoUrl || '');
  const [browserImageUrl, setBrowserImageUrl] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!username.trim() || username.trim().length < 2) {
      setError('Please enter a valid username (at least 2 characters).');
      return;
    }

    setIsSaving(true);
    try {
      const resolvedPhoto =
        browserImageUrl.trim() ||
        photoUrl.trim() ||
        makeAvatarSvg(name.trim().slice(0, 2), '#1E3A8A', '#FBF9F5');

      await onSaveProfile(
        {
          ...initialProfile,
          name: name.trim(),
          username: username.trim().replace(/[^a-zA-Z0-9_\-.]/g, ''),
          bio: bio.trim(),
          photoUrl: resolvedPhoto,
          updatedAt: new Date().toISOString()
        },
        isNewRegistration
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Author Account Profile Setup"
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-[#FBF9F5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#F3EFE6] border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold text-stone-900">
              {isNewRegistration ? 'Welcome to Safwa Publishers' : 'Edit Author Profile'}
            </h2>
            <p className="text-xs text-stone-600">
              Set your name, username, bio, and profile picture. New account details are shared
              with the Official Safwa Account for Blue Tick verification.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile setup"
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-200/70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/10 border border-rose-800/30 text-xs text-rose-900 font-medium">
              {error}
            </div>
          )}

          {/* Profile Picture: Device Upload OR Browser Image URL */}
          <div className="p-4 rounded-xl bg-[#F3EFE6] border border-stone-200 space-y-3">
            <div className="flex items-center gap-4">
              <img
                src={
                  browserImageUrl.trim() ||
                  photoUrl ||
                  makeAvatarSvg(name.slice(0, 2) || 'SW', '#9A3412', '#FBF9F5')
                }
                alt="Profile preview"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-stone-300 shrink-0"
              />
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-900 bg-white border border-stone-300 rounded-lg cursor-pointer hover:bg-stone-100 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Upload profile picture from device"
                    className="hidden"
                    onChange={handleDeviceUpload}
                  />
                </label>
                <p className="text-[11px] text-stone-500">
                  Or paste an image address from your browser below:
                </p>
              </div>
            </div>

            <div className="relative">
              <LinkIcon className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="url"
                value={browserImageUrl}
                onChange={(e) => setBrowserImageUrl(e.target.value)}
                placeholder="Paste image address from browser (https://...)"
                aria-label="Profile image address from browser"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-300 rounded-lg text-stone-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="onboard-name"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
              >
                Full Name *
              </label>
              <input
                id="onboard-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Zayd Al-Harith"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900"
              />
            </div>

            <div>
              <label
                htmlFor="onboard-username"
                className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
              >
                Username *
              </label>
              <input
                id="onboard-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., zayd_poetics"
                className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="onboard-bio"
              className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1"
            >
              Literary Bio
            </label>
            <textarea
              id="onboard-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell readers about your literary interests in Arabic, Malayalam, or English..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg text-stone-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Account Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
