'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  createScope,
  inviteToScope,
  changeMembershipRole,
  removeMembership,
  changerMotDePasse,
  updateDocumentTypeParametre,
} from '@/lib/actions/droits-actions';
import { initiales } from '@/lib/format';
import { IconPlus } from '@/components/icons';
import { DEFAULT_EMAIL_TEMPLATE } from '@/lib/email-template';

type MembershipVM = { id: string; role: string; statut: string; user: { id: string; nom: string; email: string } };
type DocTypeParametreVM = {
  type: string;
  nomAffichage: string | null;
  texteIntro: string | null;
  texteClausesAdditionnelles: string | null;
  emailSujet: string | null;
  emailCorps: string | null;
  signataireLocataire: boolean;
  signataireProprietaire: boolean;
};
type ScopeVM = {
  id: string;
  nom: string;
  memberships: MembershipVM[];
  documentTypeParametres: DocTypeParametreVM[];
};

const DOC_TYPES_CONFIGURABLES: { type: string; label: string }[] = [
  { type: 'CONTRAT', label: 'Contrat de location' },
  { type: 'CAUTIONNEMENT', label: 'Acte de cautionnement' },
  { type: 'DEPOT_GARANTIE', label: 'Dépôt de garantie' },
  { type: 'QUITTANCE', label: 'Quittance de loyer' },
  { type: 'REVISION_LOYER', label: 'Révision de loyer' },
];

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
      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-head">
          <h2>Mon compte</h2>
        </div>
        <div className="panel-body pad">
          <ChangePasswordForm />
        </div>
      </div>

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

      <DocumentTypeParametresForm scope={scope} onChanged={onChanged} />
    </div>
  );
}

function DocumentTypeParametresForm({ scope, onChanged }: { scope: ScopeVM; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(DOC_TYPES_CONFIGURABLES[0].type);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parametre = scope.documentTypeParametres.find((p) => p.type === type);
  const defautLabel = DOC_TYPES_CONFIGURABLES.find((d) => d.type === type)?.label ?? type;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const res = await updateDocumentTypeParametre(scope.id, type, fd);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ marginTop: 10 }}>
      <button type="button" className="link-row" style={{ padding: '10px 16px' }} onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} Paramétrage par type de document
      </button>
      {open && (
        <div className="panel-body pad" style={{ borderTop: '1px solid var(--line)' }}>
          <div className="field" style={{ maxWidth: 320 }}>
            <label>Type de document</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setSuccess(false);
                setError(null);
              }}
            >
              {DOC_TYPES_CONFIGURABLES.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={onSubmit} key={type}>
            {error && <div className="auth-error">{error}</div>}
            {success && (
              <div className="auth-error" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>
                Paramètres enregistrés pour « {defautLabel} ».
              </div>
            )}

            <div className="field">
              <label>Nom d&apos;affichage</label>
              <input name="nomAffichage" defaultValue={parametre?.nomAffichage ?? defautLabel} />
            </div>

            <div className="field">
              <label>Texte d&apos;introduction (optionnel)</label>
              <textarea
                name="texteIntro"
                rows={5}
                defaultValue={parametre?.texteIntro ?? ''}
                placeholder="Inséré au début du document, après l'en-tête."
              />
            </div>

            <div className="field">
              <label>Clauses additionnelles (optionnel)</label>
              <textarea
                name="texteClausesAdditionnelles"
                rows={5}
                defaultValue={parametre?.texteClausesAdditionnelles ?? ''}
                placeholder="Inséré à la fin du document, avant la formule de clôture et les signatures."
              />
            </div>
            <small style={{ color: 'var(--ink-soft)', display: 'block', marginBottom: 16 }}>
              Placeholders disponibles : <code>{'{{prenom}}'}</code> (prénom du locataire), <code>{'{{bien}}'}</code>{' '}
              (adresse du bien), <code>{'{{loyer}}'}</code> (loyer HC). Insérez <code>{'[SAUT_DE_PAGE]'}</code> seul
              sur une ligne pour forcer un saut de page.
            </small>

            <div className="field">
              <label>Sujet de l&apos;email</label>
              <input name="emailSujet" defaultValue={parametre?.emailSujet ?? defautLabel} />
            </div>
            <div className="field">
              <label>Corps de l&apos;email</label>
              <textarea
                name="emailCorps"
                rows={8}
                defaultValue={parametre?.emailCorps ?? DEFAULT_EMAIL_TEMPLATE}
              />
              <small style={{ color: 'var(--ink-soft)' }}>
                Placeholders disponibles : <code>{'{{prenom}}'}</code> (prénom du locataire),{' '}
                <code>{'{{document}}'}</code> (nom d&apos;affichage ci-dessus), <code>{'{{expediteur}}'}</code>{' '}
                (votre nom).
              </small>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.8, marginBottom: 8 }}>
                <input
                  type="checkbox"
                  name="signataireLocataire"
                  defaultChecked={parametre?.signataireLocataire ?? true}
                  style={{ width: 'auto' }}
                />
                Signature du locataire (ou du garant pour un cautionnement) requise
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.8 }}>
                <input
                  type="checkbox"
                  name="signataireProprietaire"
                  defaultChecked={parametre?.signataireProprietaire ?? false}
                  style={{ width: 'auto' }}
                />
                Signature du propriétaire requise
              </label>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>
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

function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    try {
      const res = await changerMotDePasse(fd);
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 360 }}>
      {error && <div className="auth-error">{error}</div>}
      {success && (
        <div className="auth-error" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>
          Mot de passe modifié avec succès.
        </div>
      )}
      <div className="field">
        <label>Mot de passe actuel</label>
        <input name="motDePasseActuel" type="password" required autoComplete="current-password" />
      </div>
      <div className="field">
        <label>Nouveau mot de passe</label>
        <input name="nouveauMotDePasse" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="field">
        <label>Confirmer le nouveau mot de passe</label>
        <input name="confirmation" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Modification…' : 'Modifier le mot de passe'}
      </button>
    </form>
  );
}
