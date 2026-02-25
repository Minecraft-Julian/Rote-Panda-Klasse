import { useState, useEffect } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Search, Calendar, MoreHorizontal, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

const SUBJECTS = [
  'Mathematik', 'Deutsch', 'Englisch', 'Physik', 'Chemie', 'Biologie',
  'Geschichte', 'Geographie', 'Informatik', 'Sport', 'Kunst', 'Musik',
  'Religion', 'Ethik', 'Wirtschaft', 'Latein', 'Französisch', 'Sonstiges',
];

interface HomeworkEntry {
  id: string;
  subject: string;
  description: string;
  notes?: string;
  dueDate?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  correctionProposal?: string;
  correctionVotes?: string[];
  correctionAgainst?: string[];
}

const CORRECTION_THRESHOLD = 3; // Minimum votes to apply correction

export default function HomeworkPage() {
  const { currentUser } = useAuth();
  const [entries, setEntries] = useState<HomeworkEntry[]>([]);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [correctionEntry, setCorrectionEntry] = useState<HomeworkEntry | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [form, setForm] = useState({ subject: '', description: '', notes: '', dueDate: '' });

  useEffect(() => {
    const q = query(collection(db, 'homework'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as HomeworkEntry)));
    });
    return unsub;
  }, []);

  async function addHomework() {
    if (!currentUser || !form.subject || !form.description.trim()) return;
    await addDoc(collection(db, 'homework'), {
      subject: form.subject,
      description: form.description.trim(),
      notes: form.notes.trim(),
      dueDate: form.dueDate,
      createdBy: currentUser.uid,
      createdByName: currentUser.displayName || currentUser.email || 'Unbekannt',
      createdAt: serverTimestamp(),
      correctionVotes: [],
      correctionAgainst: [],
    });
    setForm({ subject: '', description: '', notes: '', dueDate: '' });
    setShowAdd(false);
  }

  async function submitCorrection(entry: HomeworkEntry) {
    if (!correctionText.trim()) return;
    await updateDoc(doc(db, 'homework', entry.id), {
      correctionProposal: correctionText.trim(),
      correctionVotes: [],
      correctionAgainst: [],
    });
    setCorrectionEntry(null);
    setCorrectionText('');
  }

  async function voteForCorrection(entry: HomeworkEntry) {
    if (!currentUser) return;
    const ref = doc(db, 'homework', entry.id);

    // Remove from against if they were against
    if (entry.correctionAgainst?.includes(currentUser.uid)) {
      await updateDoc(ref, { correctionAgainst: arrayRemove(currentUser.uid) });
    }

    if (entry.correctionVotes?.includes(currentUser.uid)) {
      // Already voted, remove vote
      await updateDoc(ref, { correctionVotes: arrayRemove(currentUser.uid) });
    } else {
      const newVotes = [...(entry.correctionVotes || []), currentUser.uid];
      if (newVotes.length >= CORRECTION_THRESHOLD) {
        // Apply correction
        await updateDoc(ref, {
          description: entry.correctionProposal!,
          correctionProposal: null,
          correctionVotes: [],
          correctionAgainst: [],
        });
      } else {
        await updateDoc(ref, { correctionVotes: arrayUnion(currentUser.uid) });
      }
    }
  }

  async function voteAgainstCorrection(entry: HomeworkEntry) {
    if (!currentUser) return;
    const ref = doc(db, 'homework', entry.id);

    // Remove from votes if they had voted for
    if (entry.correctionVotes?.includes(currentUser.uid)) {
      await updateDoc(ref, { correctionVotes: arrayRemove(currentUser.uid) });
    }

    if (entry.correctionAgainst?.includes(currentUser.uid)) {
      await updateDoc(ref, { correctionAgainst: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(ref, { correctionAgainst: arrayUnion(currentUser.uid) });
    }
  }

  const filtered = entries.filter(e => {
    const matchSearch =
      !search ||
      e.subject.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchSubject = !subjectFilter || e.subject === subjectFilter;
    return matchSearch && matchSubject;
  });

  const subjectColors: Record<string, string> = {
    Mathematik: 'bg-blue-100 text-blue-700',
    Deutsch: 'bg-yellow-100 text-yellow-700',
    Englisch: 'bg-green-100 text-green-700',
    Physik: 'bg-purple-100 text-purple-700',
    Chemie: 'bg-pink-100 text-pink-700',
    Biologie: 'bg-emerald-100 text-emerald-700',
  };
  const defaultColor = 'bg-gray-100 text-gray-700';

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🐼 Hausaufgaben</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-red-dark transition-colors"
        >
          <Plus size={16} />
          Hinzufügen
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Hausaufgaben suchen..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-red"
          />
        </div>
        <select
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-red"
        >
          <option value="">Alle Fächer</option>
          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Homework List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🐼</span>
          <p>{search || subjectFilter ? 'Keine Hausaufgaben gefunden.' : 'Noch keine Hausaufgaben eingetragen.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(entry => {
            const myVoteFor = entry.correctionVotes?.includes(currentUser?.uid || '');
            const myVoteAgainst = entry.correctionAgainst?.includes(currentUser?.uid || '');
            return (
              <div key={entry.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${subjectColors[entry.subject] || defaultColor}`}>
                      {entry.subject}
                    </span>
                    {entry.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        {new Date(entry.dueDate + 'T00:00:00').toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { setCorrectionEntry(entry); setCorrectionText(''); }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 shrink-0"
                    title="Korrektur vorschlagen"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <p className="text-gray-800 font-medium mb-1">{entry.description}</p>
                {entry.notes && (
                  <p className="text-sm text-gray-500 mb-2">{entry.notes}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <span>von {entry.createdByName}</span>
                  {entry.createdAt?.toDate && (
                    <span>· {entry.createdAt.toDate().toLocaleDateString('de-DE')}</span>
                  )}
                </div>

                {/* Correction Proposal */}
                {entry.correctionProposal && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="text-amber-600 text-xs font-medium mt-0.5">Korrekturvorschlag:</div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{entry.correctionProposal}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => voteForCorrection(entry)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          myVoteFor
                            ? 'bg-green-500 text-white'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <ThumbsUp size={12} />
                        Stimme zu ({entry.correctionVotes?.length || 0}/{CORRECTION_THRESHOLD})
                      </button>
                      <button
                        onClick={() => voteAgainstCorrection(entry)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                          myVoteAgainst
                            ? 'bg-brand-red text-white'
                            : 'bg-brand-red-light text-brand-red-dark hover:bg-brand-red-light'
                        }`}
                      >
                        <ThumbsDown size={12} />
                        Stimme nicht zu ({entry.correctionAgainst?.length || 0})
                      </button>
                    </div>
                    {(entry.correctionVotes?.length || 0) >= CORRECTION_THRESHOLD && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <Check size={12} />
                        Korrektur wird angewendet...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Homework Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Hausaufgabe eintragen</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fach *</label>
                <select
                  value={form.subject}
                  onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
                >
                  <option value="">Fach wählen...</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Was ist auf? *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="z.B. Seite 45, Aufgabe 3a-c"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anmerkungen</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Sonstige Hinweise..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fällig am</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowAdd(false); setForm({ subject: '', description: '', notes: '', dueDate: '' }); }}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={addHomework}
                disabled={!form.subject || !form.description.trim()}
                className="flex-1 py-2 rounded-xl bg-brand-red text-white hover:bg-brand-red-dark disabled:opacity-40"
              >
                Eintragen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionEntry && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Korrektur vorschlagen</h3>
            <p className="text-sm text-gray-500 mb-4">
              Wenn {CORRECTION_THRESHOLD} Personen zustimmen, wird die Hausaufgabe automatisch korrigiert.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1">Aktuell:</p>
              <p className="text-sm text-gray-700">{correctionEntry.description}</p>
            </div>
            <textarea
              value={correctionText}
              onChange={e => setCorrectionText(e.target.value)}
              placeholder="Was ist die richtige Aufgabe?"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-red resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setCorrectionEntry(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => submitCorrection(correctionEntry)}
                disabled={!correctionText.trim()}
                className="flex-1 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40"
              >
                Vorschlagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
