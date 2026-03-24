"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Smile } from "lucide-react";

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
}

const quickEmojis = ["😀", "😂", "😍", "🔥", "👏", "🙏", "❤️", "👍"];
const emojiFontFamily =
  "Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, sans-serif";

function CommentInputInner({
  onSubmit,
  placeholder = "Add a comment...",
  maxLength = 300,
}: CommentInputProps) {
  const [text, setText] = useState("");
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEmojiOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!emojiRef.current?.contains(event.target as Node)) {
        setIsEmojiOpen(false);
      }
    };
    window.addEventListener("mousedown", onClickOutside);
    return () => window.removeEventListener("mousedown", onClickOutside);
  }, [isEmojiOpen]);

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
    <div className="px-3 py-2.5 border-t border-border-soft flex-shrink-0 bg-base pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-1.5 rounded-full bg-surface-2/70 py-1.5">
        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={() => setIsEmojiOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors flex items-center justify-center"
            aria-label="Open emoji picker"
          >
            <Smile size={18} />
          </button>
          <AnimatePresence>
            {isEmojiOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-10 left-0 w-44 z-40 rounded-xl border border-border-soft bg-surface p-2 shadow-xl"
                style={{ fontFamily: emojiFontFamily }}
              >
                <div className="grid grid-cols-4 gap-1">
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 rounded-lg hover:bg-surface-2 text-[19px] leading-none transition-colors"
                      style={{ fontFamily: emojiFontFamily }}
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
          maxLength={maxLength}
          disabled={isSubmitting}
          className="flex-1 bg-transparent border-none text-[14px] text-ink placeholder-ink-3 outline-none disabled:opacity-60"
          style={{
            fontFamily:
              "var(--font-inter), Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji, sans-serif",
          }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          className="h-8 px-3 rounded-full text-[13px] font-semibold bg-brand/15 text-brand disabled:opacity-40 disabled:text-ink-3 transition-all"
        >
          {isSubmitting ? "..." : "Post"}
        </button>
      </div>
    </div>
  );
}

const CommentInput = memo(CommentInputInner);
export default CommentInput;
