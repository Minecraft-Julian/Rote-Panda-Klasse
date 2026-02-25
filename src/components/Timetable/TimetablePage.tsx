import { ExternalLink } from 'lucide-react';

// TODO: Replace with the actual timetable website URL once provided
const TIMETABLE_URL = import.meta.env.VITE_TIMETABLE_URL || '';

export default function TimetablePage() {
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🐼 Stundenplan</h1>
        {TIMETABLE_URL && (
          <a
            href={TIMETABLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-brand-red hover:underline"
          >
            <ExternalLink size={16} />
            Extern öffnen
          </a>
        )}
      </div>

      {TIMETABLE_URL ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <iframe
            src={TIMETABLE_URL}
            title="Stundenplan"
            className="w-full"
            style={{ height: 'calc(100vh - 200px)', minHeight: 400 }}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center">
          <span className="text-5xl block mb-4">🐼</span>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Stundenplan-URL nicht konfiguriert</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Bitte trage die URL des Stundenplans in der Umgebungsvariable{' '}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-brand-red-dark">VITE_TIMETABLE_URL</code>{' '}
            ein, um den Stundenplan hier anzuzeigen.
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl text-left text-sm text-gray-600 max-w-sm mx-auto">
            <p className="font-medium mb-1">In der <code>.env</code> Datei:</p>
            <code className="text-xs text-gray-500">VITE_TIMETABLE_URL=https://deine-stundenplan-seite.de</code>
          </div>
        </div>
      )}
    </div>
  );
}
