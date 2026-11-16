import React, { useRef, useState } from 'react';
import { Eye, Hand, ShieldAlert, ArrowDownToLine } from 'lucide-react';

interface TouchControlsProps {
  crouching: boolean;
  echoActive: boolean;
  hasNearby: boolean;
  onJoystickMove: (vec: { x: number; y: number }) => void;
  onInteract: () => void;
  onToggleCrouch: () => void;
  onToggleEcho: () => void;
  onStrike: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  crouching,
  echoActive,
  hasNearby,
  onJoystickMove,
  onInteract,
  onToggleCrouch,
  onToggleEcho,
  onStrike,
}) => {
  const padRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onJoystickMove({ x: dx / maxR, y: dy / maxR });
  };

  const resetStick = () => {
    activePointerId.current = null;
    setKnob({ x: 0, y: 0 });
    onJoystickMove({ x: 0, y: 0 });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 sm:p-6">
      {/* Virtual Thumbstick (Left) */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          activePointerId.current = e.pointerId;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointerId.current !== e.pointerId) return;
          updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (activePointerId.current === e.pointerId) resetStick();
        }}
        onPointerCancel={resetStick}
        className="pointer-events-auto relative w-28 h-28 rounded-full bg-[#101217]/75 border border-white/20 flex items-center justify-center touch-none select-none"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/85 border border-amber-300 shadow-lg"
          style={{
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Action Buttons (Right) */}
      <div className="pointer-events-auto grid grid-cols-2 gap-2.5">
        <button
          onClick={onToggleEcho}
          className={`min-w-[52px] min-h-[52px] px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            echoActive
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
              : 'bg-[#101217]/80 border-white/15 text-zinc-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Écho</span>
        </button>

        <button
          onClick={onToggleCrouch}
          className={`min-w-[52px] min-h-[52px] px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
            crouching
              ? 'bg-amber-500/25 border-amber-400 text-amber-200'
              : 'bg-[#101217]/80 border-white/15 text-zinc-200'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Discret</span>
        </button>

        <button
          onClick={onStrike}
          className="min-w-[52px] min-h-[52px] px-3 rounded-xl border bg-[#101217]/80 border-red-400/35 text-red-200 active:scale-95 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Action</span>
        </button>

        <button
          onClick={onInteract}
          disabled={!hasNearby}
          className={`min-w-[52px] min-h-[52px] px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
            hasNearby
              ? 'bg-amber-500 border-amber-300 text-zinc-950 active:scale-95'
              : 'bg-[#101217]/50 border-white/10 text-zinc-500'
          }`}
        >
          <Hand className="w-4 h-4" />
          <span>Examiner</span>
        </button>
      </div>
    </div>
  );
};
