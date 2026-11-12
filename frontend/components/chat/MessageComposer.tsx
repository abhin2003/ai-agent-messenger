"use client";

import React, { useState, useRef, useEffect } from "react";
import { SendHorizontal } from "lucide-react";

interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  initialValue?: string;
  onClearInitialValue?: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = "Type a message",
  initialValue = "",
  onClearInitialValue,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external prompt selections
  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      if (onClearInitialValue) onClearInitialValue();
      setTimeout(() => {
        textareaRef.current?.focus();
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            140
          )}px`;
        }
      }, 50);
    }
  }, [initialValue, onClearInitialValue]);

  // Adjust height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const isSendDisabled = !input.trim() || isLoading || disabled;

  return (
    <div className="border-t border-[#e9edef] bg-[#f0f2f5] px-3 sm:px-6 py-2.5 select-none">
      <div className="flex items-end gap-2.5 max-w-5xl mx-auto">
        {/* Rounded Textarea Input */}
        <div className="flex-1 bg-white rounded-lg border border-[#e9edef] shadow-xs px-3.5 py-1.5 focus-within:border-[#00a884] focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isLoading}
            rows={1}
            placeholder={isLoading ? "AI Assistant is responding..." : placeholder}
            className="w-full resize-none bg-transparent text-[14px] text-[#111b21] placeholder-[#8696a0] focus:outline-none max-h-32 leading-relaxed"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={isSendDisabled}
          aria-label="Send message"
          title="Send (Enter)"
          className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition-all shadow-xs ${
            isSendDisabled
              ? "bg-[#e9edef] text-[#8696a0] cursor-not-allowed"
              : "bg-[#00a884] hover:bg-[#008069] text-white active:scale-95"
          }`}
        >
          <SendHorizontal className="h-4 w-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
};
