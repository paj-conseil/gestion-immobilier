'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createScope, inviteToScope, changeMembershipRole, removeMembership } from '@/lib/actions/droits-actions';
import { initiales } from '@/lib/format';
import { IconPlus } from '@/components/icons';

type MembershipVM = { id: string; role: string; statut: string; user: { id: string; nom: string; email: string } };
type ScopeVM = { id: string; nom: string; memberships: MembershipVM[] };

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrateur', EDITEUR: 'Éditeur', LECTEUR: 'Lecteur' };

export function DroitsView({
  currentUserId,
  myScopes,
  administeredScopes,
}: {
  currentUserId: string;
  myScopes: ScopeVM[];
  administeredScopes: ScopeVM[];
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
          <IconPlus />
          Créer un périmètre indépendant
        </button>
      </div>

      {showCreate && (
        <CreateScopeForm
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {myScopes.map((scope) => (
        <ScopeSection
          key={scope.id}
          scope={scope}
          currentUserId={currentUserId}
          titre={`Périmètre — ${scope.nom}`}
          onChanged={() => router.refresh()}
        />
      ))}

      {administeredScopes.length > 0 && (
        <>
          <div className="panel-head" style={{ border: 'none', paddingLeft: 0, marginTop: 14 }}>
            <h2 style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>
              Périmètres administrés — gérés séparément, sans accès à leurs données
            </h2>
          </div>
          {administeredScopes.map((scope) => (
            <ScopeSection
              key={scope.id}
              scope={scope}
              currentUserId={currentUserId}
              titre={scope.nom}
              onChanged={() => router.refresh()}
            />
          ))}
        </>
      )}
    </>
  );
}

function ScopeSection({
  scope,
  currentUserId,
  titre,
  onChanged,
}: {
  scope: ScopeVM;
  currentUserId: string;
  titre: string;
  onChanged: () => void;
}) {
  const [showInvite, setShowInvite] = useState(false);
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ email: string; password: string } | null>(null);

  return (
    <div style={{ marginBottom: 22 }}>
      <div className="panel-head" style={{ border: 'none', paddingLeft: 0 }}>
        <h2 style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>{titre}</h2>
        <button className="link-row" onClick={() => setShowInvite((v) => !v)}>
          + Inviter un utilisateur
        </button>
      </div>

      {tempPasswordInfo && (
        <div className="auth-error" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>
          Compte créé pour {tempPasswordInfo.email}. Mot de passe temporaire à lui communiquer :{' '}
          <b className="mono">{tempPasswordInfo.password}</b> (à changer après première connexion).
        </div>
      )}

      {showInvite && (
        <InviteForm
          scopeId={scope.id}
          onDone={(res) => {
            setShowInvite(false);
            if (res.tempPassword) setTempPasswordInfo({ email: res.email, password: res.tempPassword });
            onChanged();
          }}
        />
      )}

      {scope.memberships.map((m) => (
        <div className="scope-card" key={m.id}>
          <div className="avatar">{initiales(m.user.nom)}</div>
          <div className="info">
            <b>{m.user.nom}</b>
            <span>{m.user.email}</span>
          </div>
          <select
            value={m.role}
            onChange={(e) => changeMembershipRole(m.id, e.target.value as never).then(onChanged)}
            style={{ border: 'none', background: 'none', fontSize: 12, fontWeight: 700, color: 'var(--green-700)' }}
          >
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          {m.user.id !== currentUserId && (
            <button className="icon-btn" title="Retirer l'accès" onClick={() => removeMembership(m.id).then(onChanged)}>
              ✕
            </button>
          )}
        </div>
      ))}
      {scope.memberships.length === 0 && (
        <div style={{ color: 'var(--ink-soft)', fontSize: 12.8 }}>Aucun utilisateur pour l&apos;instant.</div>
      )}
    </div>
  );
}

function InviteForm({
  scopeId,
  onDone,
}: {
  scopeId: string;
  onDone: (res: { tempPassword?: string; email: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="field-row"
      style={{ alignItems: 'end', marginBottom: 14 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
          const res = await inviteToScope(scopeId, new FormData(e.currentTarget));
          if ('error' in res) setError(res.error);
          else onDone(res);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Nom</label>
        <input name="nom" required placeholder="Marco" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Email</label>
        <input name="email" type="email" required placeholder="marco@mail.com" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Rôle</label>
        <select name="role" defaultValue="EDITEUR">
          <option value="ADMIN">Administrateur</option>
          <option value="EDITEUR">Éditeur</option>
          <option value="LECTEUR">Lecteur</option>
        </select>
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Envoi…' : 'Inviter'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </form>
  );
}

function CreateScopeForm({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="field-row"
      style={{ alignItems: 'end', marginBottom: 20 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await createScope(String(fd.get('nom') ?? ''));
          if ('error' in res) setError(res.error);
          else onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Une erreur est survenue');
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="field" style={{ marginBottom: 0, flex: 1 }}>
        <label>Nom du nouveau périmètre</label>
        <input name="nom" required placeholder="Ex : Marco" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Création…' : 'Créer'}
      </button>
      {error && <div className="auth-error">{error}</div>}
    </form>
  );
}
