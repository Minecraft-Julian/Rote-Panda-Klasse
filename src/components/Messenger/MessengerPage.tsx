import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, query, orderBy, onSnapshot, doc,
  updateDoc, arrayUnion, getDocs, where, serverTimestamp,
  deleteDoc, type Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { filterProfanity } from '../../utils/profanityFilter';
import {
  Plus, Search, Send, Paperclip, MoreVertical, Reply,
  Trash2, Flag, X, Users, ChevronLeft, AlertTriangle,
} from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB
const MESSAGE_COOLDOWN_MS = 10000; // 10 seconds
const MAX_MESSAGES_PER_DAY = 30;

interface Group {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: Timestamp;
  description?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  fileUrl?: string;
  fileType?: 'image' | 'video' | 'file';
  fileName?: string;
  timestamp: Timestamp;
  replyToId?: string;
  replyToText?: string;
  deletedFor?: string[];
  reported?: boolean;
}

interface RateLimit {
  lastMessageTime: number;
  messagesToday: number;
  lastResetDate: string;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getRateLimit(userId: string): RateLimit {
  const stored = localStorage.getItem(`rateLimit_${userId}`);
  if (stored) return JSON.parse(stored) as RateLimit;
  return { lastMessageTime: 0, messagesToday: 0, lastResetDate: getTodayStr() };
}

function saveRateLimit(userId: string, rl: RateLimit) {
  localStorage.setItem(`rateLimit_${userId}`, JSON.stringify(rl));
}

function checkRateLimit(userId: string): { allowed: boolean; reason?: string } {
  const rl = getRateLimit(userId);
  const today = getTodayStr();
  if (rl.lastResetDate !== today) {
    rl.messagesToday = 0;
    rl.lastResetDate = today;
  }
  const now = Date.now();
  if (now - rl.lastMessageTime < MESSAGE_COOLDOWN_MS) {
    const wait = Math.ceil((MESSAGE_COOLDOWN_MS - (now - rl.lastMessageTime)) / 1000);
    return { allowed: false, reason: `Bitte warte noch ${wait} Sekunden.` };
  }
  if (rl.messagesToday >= MAX_MESSAGES_PER_DAY) {
    return { allowed: false, reason: 'Du hast heute dein Limit von 30 Nachrichten erreicht.' };
  }
  return { allowed: true };
}

function updateRateLimit(userId: string) {
  const rl = getRateLimit(userId);
  const today = getTodayStr();
  if (rl.lastResetDate !== today) {
    rl.messagesToday = 0;
    rl.lastResetDate = today;
  }
  rl.lastMessageTime = Date.now();
  rl.messagesToday += 1;
  saveRateLimit(userId, rl);
}

export default function MessengerPage() {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [addMemberError, setAddMemberError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load groups
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', currentUser.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const gs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
      setGroups(gs);
    });
    return unsub;
  }, [currentUser]);

  // Load messages for selected group
  useEffect(() => {
    if (!selectedGroup) return;
    const q = query(
      collection(db, 'groups', selectedGroup.id, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Message))
        .filter(m => !m.deletedFor?.includes(currentUser!.uid));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [selectedGroup, currentUser]);

  async function sendMessage() {
    if (!currentUser || !selectedGroup || !messageText.trim()) return;

    const check = checkRateLimit(currentUser.uid);
    if (!check.allowed) {
      setRateLimitError(check.reason!);
      setTimeout(() => setRateLimitError(''), 5000);
      return;
    }

    const filtered = filterProfanity(messageText.trim());
    const msgData: Record<string, unknown> = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email || 'Unbekannt',
      text: filtered,
      timestamp: serverTimestamp(),
      deletedFor: [],
    };
    if (replyTo) {
      msgData.replyToId = replyTo.id;
      msgData.replyToText = replyTo.text || '[Datei]';
    }

    await addDoc(collection(db, 'groups', selectedGroup.id, 'messages'), msgData);
    updateRateLimit(currentUser.uid);
    setMessageText('');
    setReplyTo(null);
  }

  async function sendFile(file: File) {
    if (!currentUser || !selectedGroup) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert('Datei zu groß. Maximum: 1 GB');
      return;
    }

    const check = checkRateLimit(currentUser.uid);
    if (!check.allowed) {
      setRateLimitError(check.reason!);
      setTimeout(() => setRateLimitError(''), 5000);
      return;
    }

    const fileRef = ref(storage, `groups/${selectedGroup.id}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on('state_changed',
      snapshot => {
        setUploadProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100));
      },
      () => {
        setUploadProgress(null);
        alert('Upload fehlgeschlagen.');
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        let fileType: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) fileType = 'image';
        else if (file.type.startsWith('video/')) fileType = 'video';

        await addDoc(collection(db, 'groups', selectedGroup.id, 'messages'), {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || currentUser.email || 'Unbekannt',
          fileUrl: url,
          fileType,
          fileName: file.name,
          timestamp: serverTimestamp(),
          deletedFor: [],
        });
        updateRateLimit(currentUser.uid);
        setUploadProgress(null);
      }
    );
  }

  async function createGroup() {
    if (!currentUser || !newGroupName.trim()) return;
    await addDoc(collection(db, 'groups'), {
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      createdBy: currentUser.uid,
      members: [currentUser.uid],
      createdAt: serverTimestamp(),
    });
    setNewGroupName('');
    setNewGroupDesc('');
    setShowCreateGroup(false);
  }

  async function deleteGroup(group: Group) {
    if (!currentUser || group.createdBy !== currentUser.uid) return;
    if (!confirm(`Gruppe "${group.name}" wirklich löschen?`)) return;
    await deleteDoc(doc(db, 'groups', group.id));
    setSelectedGroup(null);
  }

  async function deleteMessageForMe(msgId: string) {
    if (!currentUser || !selectedGroup) return;
    await updateDoc(doc(db, 'groups', selectedGroup.id, 'messages', msgId), {
      deletedFor: arrayUnion(currentUser.uid),
    });
    setActiveMsg(null);
  }

  async function reportMessage(msg: Message) {
    if (!currentUser || !selectedGroup) return;
    // Mark message as reported
    await updateDoc(doc(db, 'groups', selectedGroup.id, 'messages', msg.id), {
      reported: true,
    });
    // Create report document
    await addDoc(collection(db, 'reports'), {
      messageId: msg.id,
      groupId: selectedGroup.id,
      reportedBy: currentUser.uid,
      reason: 'Gemeldet von Nutzer',
      timestamp: serverTimestamp(),
      resolved: false,
    });
    setActiveMsg(null);
    alert('Nachricht wurde gemeldet. Ein Administrator wird sie überprüfen.');
  }

  async function addMember() {
    if (!currentUser || !selectedGroup || !memberEmail.trim()) return;
    setAddMemberError('');
    // Find user by email
    const q = query(collection(db, 'users'), where('email', '==', memberEmail.trim()));
    const snap = await getDocs(q);
    if (snap.empty) {
      setAddMemberError('Kein Benutzer mit dieser E-Mail gefunden.');
      return;
    }
    const userDoc = snap.docs[0];
    await updateDoc(doc(db, 'groups', selectedGroup.id), {
      members: arrayUnion(userDoc.id),
    });
    setMemberEmail('');
    setShowAddMember(false);
  }

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isGroupOwner = selectedGroup?.createdBy === currentUser?.uid;

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ backgroundColor: 'var(--panda-bg)' }}>
      {/* Group Sidebar */}
      <div className={`${selectedGroup ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-72 bg-white border-r border-brand-red-light`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Gruppen</h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="p-1.5 text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
              title="Neue Gruppe"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Gruppe suchen..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              {searchQuery ? 'Keine Gruppen gefunden' : 'Noch keine Gruppen. Erstelle eine!'}
            </div>
          ) : (
            filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  selectedGroup?.id === group.id ? 'bg-brand-red-light' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-brand-red-light flex items-center justify-center text-brand-red-dark font-bold shrink-0">
                  {group.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 truncate">{group.name}</div>
                  {group.description && (
                    <div className="text-xs text-gray-400 truncate">{group.description}</div>
                  )}
                  <div className="text-xs text-gray-400">{group.members.length} Mitglieder</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedGroup ? (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chat Header */}
          <div className="bg-white border-b border-brand-red-light px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setSelectedGroup(null)}
              className="md:hidden text-gray-500 hover:text-gray-700 p-1"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-brand-red-light flex items-center justify-center text-brand-red-dark font-bold">
              {selectedGroup.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">{selectedGroup.name}</div>
              <div className="text-xs text-gray-400">{selectedGroup.members.length} Mitglieder</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAddMember(true)}
                className="p-2 text-gray-500 hover:text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
                title="Mitglied hinzufügen"
              >
                <Users size={18} />
              </button>
              {isGroupOwner && (
                <button
                  onClick={() => deleteGroup(selectedGroup)}
                  className="p-2 text-gray-500 hover:text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
                  title="Gruppe löschen"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map(msg => {
              const isOwn = msg.senderId === currentUser?.uid;
              return (
                <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <span className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                    )}
                    {msg.replyToText && (
                      <div className={`text-xs px-2 py-1 rounded-t-lg border-l-2 border-brand-red bg-gray-100 text-gray-500 max-w-full truncate mb-0.5`}>
                        ↩ {msg.replyToText}
                      </div>
                    )}
                    <div
                      className={`relative px-4 py-2 rounded-2xl text-sm ${
                        isOwn
                          ? 'bg-brand-red text-white rounded-br-sm'
                          : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                      } ${msg.reported ? 'opacity-60' : ''}`}
                    >
                      {msg.text && <span>{msg.text}</span>}
                      {msg.fileUrl && msg.fileType === 'image' && (
                        <img src={msg.fileUrl} alt={msg.fileName} className="max-w-[200px] rounded-lg" />
                      )}
                      {msg.fileUrl && msg.fileType === 'video' && (
                        <video src={msg.fileUrl} controls className="max-w-[200px] rounded-lg" />
                      )}
                      {msg.fileUrl && msg.fileType === 'file' && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                           className={`flex items-center gap-1 underline ${isOwn ? 'text-white' : 'text-brand-red'}`}>
                          📎 {msg.fileName}
                        </a>
                      )}
                      <span className={`text-xs mt-1 block ${isOwn ? 'text-brand-red-light' : 'text-gray-400'}`}>
                        {msg.timestamp?.toDate
                          ? msg.timestamp.toDate().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                        {msg.reported && <span className="ml-1 text-yellow-400">⚠️</span>}
                      </span>
                    </div>

                    {/* Message Actions */}
                    <div className={`flex gap-1 mt-1 ${activeMsg === msg.id ? 'flex' : 'hidden group-hover:flex'}`}>
                      <button
                        onClick={() => { setReplyTo(msg); setActiveMsg(null); }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Antworten"
                      >
                        <Reply size={14} />
                      </button>
                      <button
                        onClick={() => deleteMessageForMe(msg.id)}
                        className="p-1 text-gray-400 hover:text-brand-red hover:bg-brand-red-light rounded"
                        title="Für mich löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => reportMessage(msg)}
                        className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded"
                        title="Melden"
                      >
                        <Flag size={14} />
                      </button>
                      <button
                        onClick={() => setActiveMsg(activeMsg === msg.id ? null : msg.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Rate limit error */}
          {rateLimitError && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-yellow-50 text-yellow-700 rounded-lg px-3 py-2 text-sm">
              <AlertTriangle size={16} />
              {rateLimitError}
            </div>
          )}

          {/* Upload progress */}
          {uploadProgress !== null && (
            <div className="mx-4 mb-2 bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700">
              Upload: {uploadProgress}%
              <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

          {/* Reply Preview */}
          {replyTo && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">
              <Reply size={14} className="text-brand-red shrink-0" />
              <span className="truncate flex-1">Antwort auf: {replyTo.text || '[Datei]'}</span>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Message Input */}
          <div className="bg-white border-t border-brand-red-light px-4 py-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) sendFile(e.target.files[0]); }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-brand-red hover:bg-brand-red-light rounded-lg transition-colors"
              title="Datei senden (max. 1 GB)"
            >
              <Paperclip size={20} />
            </button>
            <input
              type="text"
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Nachricht schreiben..."
              className="flex-1 bg-gray-50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
            />
            <button
              onClick={sendMessage}
              disabled={!messageText.trim()}
              className="p-2 bg-brand-red text-white rounded-xl hover:bg-brand-red-dark disabled:opacity-40 transition-colors"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
          <span className="text-5xl">🐼</span>
          <p className="text-lg">Wähle eine Gruppe aus oder erstelle eine neue</p>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Neue Gruppe erstellen</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Gruppenname *"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              <input
                type="text"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                placeholder="Beschreibung (optional)"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowCreateGroup(false); setNewGroupName(''); setNewGroupDesc(''); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim()}
                className="flex-1 py-2 rounded-xl bg-brand-red text-white hover:bg-brand-red-dark disabled:opacity-40"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Mitglied hinzufügen</h3>
            {addMemberError && (
              <div className="text-brand-red-dark text-sm mb-3">{addMemberError}</div>
            )}
            <input
              type="email"
              value={memberEmail}
              onChange={e => setMemberEmail(e.target.value)}
              placeholder="E-Mail des Nutzers"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddMember(false); setMemberEmail(''); setAddMemberError(''); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={addMember}
                disabled={!memberEmail.trim()}
                className="flex-1 py-2 rounded-xl bg-brand-red text-white hover:bg-brand-red-dark disabled:opacity-40"
              >
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
