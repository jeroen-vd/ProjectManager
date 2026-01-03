"use client";

import type { ReactNode } from "react";
import type { PopupState } from "./useCenteredPopup";

type CenteredPopupProps = {
  popup: PopupState | null;
  onClose: () => void;
  actions?: ReactNode;
};

const toneStyles: Record<
  NonNullable<PopupState>["tone"],
  { border: string; badge: string; text: string }
> = {
  info: {
    border: "border-slate-200",
    badge: "bg-slate-100 text-slate-600",
    text: "text-slate-700",
  },
  success: {
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
  },
  warning: {
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
  error: {
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
  },
};

export default function CenteredPopup({
  popup,
  onClose,
  actions,
}: CenteredPopupProps) {
  if (!popup) {
    return null;
  }

  const style = toneStyles[popup.tone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Sluiten"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-3xl border ${style.border} bg-white px-6 py-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${style.badge}`}
            >
              {popup.title}
            </span>
            <p className={`text-sm ${style.text}`}>{popup.message}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onClose}
          >
            Sluiten
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          {actions}
          {!actions ? (
            <button
              type="button"
              className="h-10 rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={onClose}
            >
              OK
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
