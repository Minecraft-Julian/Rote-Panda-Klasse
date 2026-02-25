import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('invalid-email')) {
        setError('Diese E-Mail-Adresse ist nicht registriert.');
      } else if (msg.includes('too-many-requests')) {
        setError('Zu viele Versuche. Bitte später erneut versuchen.');
      } else {
        setError('Fehler beim Senden der E-Mail. Bitte erneut versuchen.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--panda-bg)' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">E-Mail gesendet!</h2>
          <p className="text-gray-500 mb-6">
            Wir haben eine E-Mail zum Zurücksetzen des Passworts an <strong>{email}</strong> gesendet.
            Bitte überprüfe dein Postfach.
          </p>
          <Link
            to="/login"
            className="inline-block bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 px-6 rounded-xl transition-colors"
          >
            Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--panda-bg)' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <span className="text-3xl">🐼</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Passwort vergessen?</h1>
          <p className="text-gray-500 mt-1">Wir senden dir einen Reset-Link per E-Mail.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg p-3 mb-4">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="deine@email.de"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            <Mail size={18} />
            Reset-Link senden
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="inline-flex items-center gap-1 text-red-500 hover:underline font-medium">
            <ArrowLeft size={14} />
            Zurück zur Anmeldung
          </Link>
        </p>
      </div>
    </div>
  );
}
