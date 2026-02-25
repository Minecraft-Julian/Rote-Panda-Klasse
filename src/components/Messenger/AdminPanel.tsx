import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, doc,
  updateDoc, getDocs, orderBy, limit, deleteDoc, arrayUnion,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Shield, Trash2, Ban, Check } from 'lucide-react';

interface Report {
  id: string;
  messageId: string;
  groupId: string;
  reportedBy: string;
  reason: string;
  timestamp: { toDate: () => Date };
  resolved: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  timestamp: { toDate: () => Date };
}

export default function AdminPanel() {
  const [reports, setReports] = useState<Report[]>([]);
  const [contextMessages, setContextMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    const q = query(collection(db, 'reports'), where('resolved', '==', false));
    const unsub = onSnapshot(q, async snap => {
      const reps = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      setReports(reps);

      // Load context messages for each report
      const ctx: Record<string, Message[]> = {};
      for (const rep of reps) {
        const q2 = query(
          collection(db, 'groups', rep.groupId, 'messages'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const msgs = await getDocs(q2);
        ctx[rep.id] = msgs.docs.map(d => ({ id: d.id, ...d.data() } as Message)).reverse();
      }
      setContextMessages(ctx);
    });
    return unsub;
  }, []);

  async function deleteMessage(groupId: string, messageId: string) {
    await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
  }

  async function muteUserInGroup(userId: string, groupId: string) {
    await updateDoc(doc(db, 'groups', groupId), {
      mutedMembers: arrayUnion(userId),
    });
  }

  async function resolveReport(reportId: string) {
    await updateDoc(doc(db, 'reports', reportId), { resolved: true });
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6">
        <Shield size={24} className="text-red-500" />
        <h1 className="text-2xl font-bold text-gray-800">🐼 Admin Panel</h1>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <span className="text-5xl block mb-3">🐼</span>
          <p className="text-gray-500">Keine offenen Meldungen.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="font-semibold text-gray-800">Meldung</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {report.timestamp?.toDate?.()?.toLocaleString('de-DE')}
                  </span>
                </div>
                <button
                  onClick={() => resolveReport(report.id)}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg"
                >
                  <Check size={14} /> Erledigt
                </button>
              </div>

              {/* Context Messages */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-xs text-gray-400 mb-2">Letzte 10 Nachrichten:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(contextMessages[report.id] || []).map(msg => (
                    <div key={msg.id} className={`flex items-start gap-2 p-2 rounded-lg ${
                      msg.id === report.messageId ? 'bg-orange-100 border border-orange-300' : 'bg-white'
                    }`}>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-600">{msg.senderName}: </span>
                        <span className="text-sm text-gray-700">
                          {msg.text || (msg.fileUrl ? `[${msg.fileType}: ${msg.fileName}]` : '')}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => deleteMessage(report.groupId, msg.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="Nachricht löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => muteUserInGroup(msg.senderId, report.groupId)}
                          className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded"
                          title="Nutzer stummschalten"
                        >
                          <Ban size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
