'use client';

import Link from 'next/link';
import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPassword } from '@/lib/actions/password-actions';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : 'Lien incomplet. Faites une nouvelle demande.');
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const res = await resetPassword(token, password);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand" style={{ borderBottom: 'none', marginBottom: 20, padding: 0 }}>
          <div className="brand-mark">PL</div>
          <div className="brand-text" style={{ color: 'var(--ink)' }}>
            <strong>Gestion immo</strong>
            <span style={{ color: 'var(--ink-soft)' }}>Nouveau mot de passe</span>
          </div>
        </div>

        {done ? (
          <>
            <div className="auth-success">Votre mot de passe a été modifié. Vous pouvez vous connecter.</div>
            <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Se connecter
            </Link>
          </>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="password">Nouveau mot de passe (8 caractères minimum)</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirmer le mot de passe</label>
                <input
                  id="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading || !token}
              >
                {loading ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
            <div className="auth-links">
              <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReinitialiserPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
