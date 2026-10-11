'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { requestPasswordReset } from '@/lib/actions/password-actions';

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ borderBottom: 'none', marginBottom: 20, padding: 0 }}>
          <div className="brand-mark">PL</div>
          <div className="brand-text" style={{ color: 'var(--ink)' }}>
            <strong>Gestion immo</strong>
            <span style={{ color: 'var(--ink-soft)' }}>Mot de passe oublié</span>
          </div>
        </div>

        {sent ? (
          <div className="auth-success">
            Si un compte existe pour <strong>{email}</strong>, un email contenant un lien de réinitialisation vient
            d&apos;être envoyé. Le lien est valable 1 heure. Pensez à regarder dans les courriers indésirables.
          </div>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <p className="auth-hint">Indiquez l&apos;email de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>
          </>
        )}

        <div className="auth-links">
          <Link href="/login">← Retour à la connexion</Link>
        </div>
      </div>
    </div>
  );
}
