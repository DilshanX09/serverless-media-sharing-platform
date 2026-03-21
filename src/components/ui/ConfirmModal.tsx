"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] bg-black/60 flex items-end sm:items-center justify-center sm:p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full sm:max-w-[380px] rounded-t-2xl sm:rounded-2xl sm:border sm:border-border-soft bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-4 sm:py-3 border-b border-border-soft text-center sm:text-left">
              <p className="text-[16px] sm:text-[15px] font-semibold text-ink">{title}</p>
            </div>
            {description ? (
              <p className="px-4 py-4 text-[14px] sm:text-[13px] text-ink-2 text-center sm:text-left">{description}</p>
            ) : null}
            <div className="p-4 flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isConfirming}
                className={[
                  "w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-[14px] sm:text-[13px] font-semibold text-base disabled:opacity-60 inline-flex items-center justify-center gap-1.5 order-1 sm:order-2",
                  tone === "danger" ? "bg-red-500 hover:bg-red-500/90" : "bg-ink hover:opacity-90",
                ].join(" ")}
              >
                {isConfirming ? <Loader2 size={14} className="animate-spin" /> : null}
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isConfirming}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl bg-surface-2 text-[14px] sm:text-[13px] font-semibold text-ink-2 hover:text-ink disabled:opacity-50 order-2 sm:order-1"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
