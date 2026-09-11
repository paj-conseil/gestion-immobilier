'use client';

import { useRef, useState } from 'react';

export function SignaturePad({
  defaultName,
  onSubmit,
  submitting,
}: {
  defaultName?: string;
  onSubmit: (signatureDataUrl: string, nom: string) => void;
  submitting?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [nom, setNom] = useState(defaultName ?? '');

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Le canvas a une résolution interne fixe (600x180) mais s'affiche à la
    // largeur du conteneur (responsive) — on remet à l'échelle les
    // coordonnées du pointeur pour que le trait suive exactement le
    // doigt/curseur quel que soit le rapport d'affichage.
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getPos(e);
    ctx.strokeStyle = '#1c241e';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function end() {
    drawingRef.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function submit() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn || !nom.trim()) return;
    onSubmit(canvas.toDataURL('image/png'), nom.trim());
  }

  return (
    <div>
      <div className="field">
        <label>Nom du signataire</label>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" />
      </div>
      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 8,
          background: '#fff',
          touchAction: 'none',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          style={{
            width: '100%',
            height: 180,
            display: 'block',
            cursor: 'crosshair',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '6px 0 0' }}>
        Signez avec le doigt (écran tactile) ou à la souris.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button type="button" className="btn btn-ghost" onClick={clear} disabled={submitting}>
          Effacer
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!hasDrawn || !nom.trim() || submitting}
        >
          {submitting ? 'Signature en cours…' : 'Valider la signature'}
        </button>
      </div>
    </div>
  );
}
