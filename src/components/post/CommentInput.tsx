"use client";

import { memo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smile } from "lucide-react";

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
}

const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];

function CommentInputInner({ onSubmit, placeholder = "Add a comment..." }: CommentInputProps) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText("");
      setIsEmojiOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setText((prev) => prev + emoji);
    setIsEmojiOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-border-soft flex-shrink-0 bg-surface pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="relative" ref={emojiRef}>
        <button
          type="button"
          onClick={() => setIsEmojiOpen((prev) => !prev)}
          className="p-1.5 text-ink-3 hover:text-ink transition-colors"
          aria-label="Open emoji picker"
        >
          <Smile size={24} />
        </button>
        <AnimatePresence>
          {isEmojiOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-12 left-0 z-20 rounded-xl border border-border-soft bg-surface p-2 shadow-xl"
            >
              <div className="grid grid-cols-4 gap-1">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="w-9 h-9 rounded-lg hover:bg-surface-2 text-[20px] transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="flex-1 bg-transparent border-none text-[14px] text-ink placeholder-ink-3 outline-none disabled:opacity-60"
        style={{
          fontFamily:
            "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || isSubmitting}
        className="text-[14px] font-semibold text-brand disabled:opacity-40 disabled:text-ink-3 transition-all"
      >
        {isSubmitting ? "..." : "Post"}
      </button>
    </div>
  );
}

const CommentInput = memo(CommentInputInner);
export default CommentInput;
