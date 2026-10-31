import React, { useState } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import type { DirectMessage, UserProfile } from '../utils/editorialLogic';
import { BlueTickBadge } from './BlueTickBadge';

interface DirectMessagesModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  users: UserProfile[];
  messages: DirectMessage[];
  initialRecipientId: string | null;
  onClose: () => void;
  onSendMessage: (receiver: UserProfile, text: string) => void;
}

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  currentUser,
  users,
  messages,
  initialRecipientId,
  onClose,
  onSendMessage
}) => {
  const availableContacts = users.filter((u) => u.uid !== currentUser.uid);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialRecipientId || availableContacts[0]?.uid || 'safwa_official_account'
  );
  const [draftText, setDraftText] = useState('');

  if (!isOpen) return null;

  const activePartner =
    users.find((u) => u.uid === (initialRecipientId || selectedUserId)) ||
    availableContacts[0] ||
    users[0];

  const threadMessages = messages.filter(
    (m) =>
      (m.senderId === currentUser.uid && m.receiverId === activePartner?.uid) ||
      (m.senderId === activePartner?.uid && m.receiverId === currentUser.uid)
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftText.trim() || !activePartner) return;
    onSendMessage(activePartner, draftText.trim());
    setDraftText('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Direct Messages"
      className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl h-[560px] bg-[#FBF9F5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Sidebar: Instagram-Style Direct Threads */}
        <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-stone-200 bg-[#F3EFE6] flex flex-col">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-800" />
              <span className="text-sm font-semibold text-stone-900">
                Safwa Direct (@{currentUser.username})
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-200/60">
            {availableContacts.map((contact) => {
              const isSelected = contact.uid === activePartner?.uid;
              return (
                <button
                  key={contact.uid}
                  type="button"
                  onClick={() => setSelectedUserId(contact.uid)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                    isSelected ? 'bg-[#FBF9F5]' : 'hover:bg-stone-200/50'
                  }`}
                >
                  <img
                    src={contact.photoUrl}
                    alt={contact.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-stone-300 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-stone-900 truncate">
                        {contact.name}
                      </span>
                      {contact.isVerified && <BlueTickBadge size={13} />}
                    </div>
                    <p className="text-[11px] text-stone-500 truncate">@{contact.username}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Conversation Pane */}
        <div className="flex-1 flex flex-col bg-[#FBF9F5]">
          {/* Active Partner Header */}
          <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
            {activePartner ? (
              <div className="flex items-center gap-3">
                <img
                  src={activePartner.photoUrl}
                  alt={activePartner.name}
                  referrerPolicy="no-referrer"
                  className="w-9 h-9 rounded-full object-cover border border-stone-300"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-stone-900">
                      {activePartner.name}
                    </span>
                    {activePartner.isVerified && <BlueTickBadge size={15} />}
                  </div>
                  <p className="text-xs text-stone-500">@{activePartner.username}</p>
                </div>
              </div>
            ) : (
              <span className="text-sm font-semibold text-stone-900">Select an Author</span>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close direct messages"
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-3">
            {threadMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-stone-500">
                <p className="text-sm font-display italic">
                  Begin a literary conversation with {activePartner?.name}.
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Direct messages are synced in real time.
                </p>
              </div>
            ) : (
              threadMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs md:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMine
                          ? 'bg-stone-900 text-white rounded-br-xs'
                          : 'bg-[#F3EFE6] text-stone-900 border border-stone-200 rounded-bl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span
                        className={`block text-[10px] mt-1 font-mono-num ${
                          isMine ? 'text-stone-400' : 'text-stone-500'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSend}
            className="p-4 border-t border-stone-200 bg-white flex items-center gap-3"
          >
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={`Message ${activePartner?.name || 'author'}...`}
              aria-label="Direct message input"
              className="flex-1 px-4 py-2.5 text-xs bg-[#FBF9F5] border border-stone-300 rounded-full text-stone-900 focus:outline-none focus:border-amber-800"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-amber-800 rounded-full hover:bg-amber-900 transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
