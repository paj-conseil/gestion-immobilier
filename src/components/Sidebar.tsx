'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { signOut } from 'next-auth/react';
import {
  IconBiens,
  IconCompta,
  IconDashboard,
  IconDocuments,
  IconDroits,
  IconEcheances,
  IconEdl,
  IconLocataires,
} from '@/components/icons';
import { setActiveScope } from '@/lib/actions/scope-actions';

type Membership = { scopeId: string; scopeNom: string; role: string };

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: IconDashboard },
  { href: '/biens', label: 'Biens', icon: IconBiens },
  { href: '/locataires', label: 'Locataires', icon: IconLocataires },
  { href: '/documents', label: 'Documents', icon: IconDocuments, badgeKey: 'documents' as const },
  { href: '/edl', label: 'États des lieux', icon: IconEdl },
  { href: '/echeances', label: 'Échéances', icon: IconEcheances, badgeKey: 'echeances' as const },
  { href: '/compta', label: 'Comptabilité', icon: IconCompta },
  { href: '/droits', label: 'Droits & accès', icon: IconDroits },
];

function initials(nom: string) {
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export function Sidebar({
  userNom,
  scopeId,
  scopeNom,
  memberships,
  badges,
}: {
  userNom: string;
  scopeId: string;
  scopeNom: string;
  memberships: Membership[];
  badges: { documents: number; echeances: number };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const [, startTransition] = useTransition();

  function handleSwitch(newScopeId: string) {
    if (newScopeId === scopeId) {
      setSwitching(false);
      return;
    }
    startTransition(async () => {
      await setActiveScope(newScopeId);
      setSwitching(false);
      router.refresh();
    });
  }

  const badgeValue = (key?: 'documents' | 'echeances') => (key ? badges[key] : undefined);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">PL</div>
        <div className="brand-text">
          <strong>Gestion immo</strong>
          <span>{scopeNom}</span>
        </div>
      </div>

      <div className="nav-group">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          const badge = badgeValue(item.badgeKey);
          return (
            <Link key={item.href} href={item.href} className={`nav-item${active ? ' active' : ''}`}>
              <Icon />
              {item.label}
              {!!badge && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-foot">
        {switching ? (
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 'var(--radius-s)', padding: 8 }}>
            {memberships.map((m) => (
              <button
                key={m.scopeId}
                onClick={() => handleSwitch(m.scopeId)}
                className="nav-item"
                style={{ marginBottom: 2 }}
              >
                <span className="scope-avatar" style={{ marginRight: 4 }}>
                  {initials(m.scopeNom)}
                </span>
                {m.scopeNom}
              </button>
            ))}
            <button onClick={() => setSwitching(false)} className="nav-item" style={{ color: '#9FB6A2' }}>
              Annuler
            </button>
          </div>
        ) : (
          <button
            className="scope-switch"
            onClick={() => memberships.length > 1 && setSwitching(true)}
            title={memberships.length > 1 ? 'Changer de périmètre' : undefined}
          >
            <div className="scope-avatar">{initials(scopeNom)}</div>
            <div>
              <strong>Périmètre : {scopeNom}</strong>
              <span>{userNom} {memberships.length > 1 ? '· Changer…' : ''}</span>
            </div>
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item"
          style={{ marginTop: 8, color: '#9FB6A2', fontSize: 12 }}
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}
