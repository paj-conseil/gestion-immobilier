'use client';

import { useState } from 'react';

function formatGroupes(raw: string): string {
  const normalized = raw.replace(/\./g, ',');
  const [intPart, decPart] = normalized.split(',');
  const digitsOnly = intPart.replace(/\D/g, '');
  const grouped = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart !== undefined ? `${grouped},${decPart.replace(/\D/g, '')}` : grouped;
}

/** Champ montant affiché au format "139 000" avec un suffixe "€", tout en
 * restant un simple champ texte soumis dans le formulaire (le parsing côté
 * serveur retire les espaces et convertit la virgule en point). */
export function MontantField({
  name,
  defaultValue,
  placeholder,
  required,
}: {
  name: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  required?: boolean;
}) {
  const initial =
    defaultValue !== undefined && defaultValue !== null && defaultValue !== ''
      ? formatGroupes(String(defaultValue))
      : '';
  const [display, setDisplay] = useState(initial);

  return (
    <div style={{ position: 'relative' }}>
      <input
        name={name}
        inputMode="decimal"
        placeholder={placeholder}
        required={required}
        value={display}
        onChange={(e) => setDisplay(formatGroupes(e.target.value))}
        style={{ paddingRight: 26 }}
      />
      <span
        style={{
          position: 'absolute',
          right: 11,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--ink-soft)',
          fontSize: 12.5,
          pointerEvents: 'none',
        }}
      >
        €
      </span>
    </div>
  );
}
