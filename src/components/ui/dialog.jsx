// src/components/ui/dialog.jsx
import React from "react";

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
      onClick={() => onOpenChange?.(false)}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" />
      {/* container */}
      <div
        className="relative z-[61] w-[92vw] max-w-md max-h-[85vh] overflow-auto rounded-2xl border
                   bg-gradient-to-b from-zinc-900 to-zinc-950 border-white/10
                   dark:from-zinc-900 dark:to-zinc-950
                   bg-white border-zinc-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
function BareModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      {/* CONTENT CENTRALIZADO */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-[92vw] max-w-md rounded-2xl shadow-2xl border
                        bg-white text-zinc-900
                        dark:bg-zinc-900 dark:text-white dark:border-white/10">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DialogContent({ className = "", children }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function DialogHeader({ className = "", children }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function DialogTitle({ className = "", children }) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

/* Opcional: para compatibilidade com código antigo */
export function DialogTrigger({ children }) {
  return children ?? null;
}
