"use client";

import { Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="w-full max-w-[420px] rounded-2xl border border-border-soft bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border-soft">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
        </div>
        {description ? <p className="px-4 py-4 text-[13px] text-ink-2">{description}</p> : null}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="px-3 py-2 rounded-xl bg-surface-2 text-[13px] font-semibold text-ink-2 hover:text-ink disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={[
              "px-3 py-2 rounded-xl text-[13px] font-semibold text-base disabled:opacity-60 inline-flex items-center gap-1.5",
              tone === "danger" ? "bg-red-500 hover:bg-red-500/90" : "bg-ink hover:opacity-90",
            ].join(" ")}
          >
            {isConfirming ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
