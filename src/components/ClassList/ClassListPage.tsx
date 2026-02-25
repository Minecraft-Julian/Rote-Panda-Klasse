import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Phone, Mail, MapPin, Pencil, Check, X, Thermometer } from 'lucide-react';

interface ClassMember {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  address?: string;
  isSickToday?: boolean;
  sickDate?: string;
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function ClassListPage() {
  const { currentUser } = useAuth();
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', email: '' });

  useEffect(() => {
    if (!currentUser) return;
    // Ensure own entry exists
    const ownRef = doc(db, 'classlist', currentUser.uid);
    setDoc(ownRef, {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email || 'Unbekannt',
      email: currentUser.email || '',
    }, { merge: true });

    // Listen to all class members
    const unsub = onSnapshot(collection(db, 'classlist'), snap => {
      const list = snap.docs.map(d => d.data() as ClassMember);
      list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setMembers(list);

      // Prefill own form
      const own = list.find(m => m.uid === currentUser.uid);
      if (own) {
        setForm({
          phone: own.phone || '',
          address: own.address || '',
          email: own.email || currentUser.email || '',
        });
      }
    });
    return unsub;
  }, [currentUser]);

  async function saveProfile() {
    if (!currentUser) return;
    await setDoc(doc(db, 'classlist', currentUser.uid), {
      uid: currentUser.uid,
      displayName: currentUser.displayName || currentUser.email || 'Unbekannt',
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
    }, { merge: true });
    setEditing(false);
  }

  async function toggleSick() {
    if (!currentUser) return;
    const today = getTodayStr();
    const own = members.find(m => m.uid === currentUser.uid);
    const wasSick = own?.isSickToday && own?.sickDate === today;
    await setDoc(doc(db, 'classlist', currentUser.uid), {
      isSickToday: !wasSick,
      sickDate: today,
    }, { merge: true });
  }

  const ownEntry = members.find(m => m.uid === currentUser?.uid);
  const today = getTodayStr();

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🐼 Klassenliste</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              ownEntry?.isSickToday && ownEntry?.sickDate === today
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Thermometer size={16} />
            {ownEntry?.isSickToday && ownEntry?.sickDate === today ? 'Krank (heute)' : 'Heute krank?'}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-medium hover:bg-brand-red-dark transition-colors"
          >
            <Pencil size={14} />
            Meine Daten
          </button>
        </div>
      </div>

      {/* Edit Own Profile */}
      {editing && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-700 mb-4">Meine Kontaktdaten bearbeiten</h2>
          <p className="text-sm text-gray-500 mb-4">Alle Felder sind optional. Du entscheidest, was du teilen möchtest.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="deine@email.de"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefonnummer</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+49 123 456789"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Musterstraße 1, 12345 Musterstadt"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              <X size={15} /> Abbrechen
            </button>
            <button
              onClick={saveProfile}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-red text-white rounded-xl hover:bg-brand-red-dark"
            >
              <Check size={15} /> Speichern
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.map(member => {
          const isSick = member.isSickToday && member.sickDate === today;
          const isMe = member.uid === currentUser?.uid;
          return (
            <div
              key={member.uid}
              className={`bg-white rounded-3xl shadow-sm border p-4 flex items-start gap-4 ${
                isSick ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100'
              } ${isMe ? 'ring-2 ring-brand-red' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-brand-red-light flex items-center justify-center text-brand-red-dark font-bold text-lg shrink-0">
                {(member.displayName || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{member.displayName}</span>
                  {isMe && <span className="text-xs bg-brand-red-light text-brand-red-dark px-2 py-0.5 rounded-full">Ich</span>}
                  {isSick && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Thermometer size={11} /> Heute krank
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1">
                  {member.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Mail size={13} className="shrink-0" />
                      <a href={`mailto:${member.email}`} className="hover:text-brand-red truncate">{member.email}</a>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Phone size={13} className="shrink-0" />
                      <a href={`tel:${member.phone}`} className="hover:text-brand-red">{member.phone}</a>
                    </div>
                  )}
                  {member.address && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin size={13} className="shrink-0" />
                      <span>{member.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
