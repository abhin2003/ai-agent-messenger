"use client";

import React, { useEffect, useRef } from "react";
import { ChatMessage, AgentConfig } from "@/types";
import { MessageItem } from "./MessageItem";
import { EmptyState } from "./EmptyState";

interface ChatMessagesProps {
  messages: ChatMessage[];
  agent: AgentConfig;
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  agent,
  isLoading,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 chat-wallpaper flex flex-col overflow-y-auto">
        <EmptyState agent={agent} onSelectPrompt={onSelectPrompt} />
      </div>
    );
  }

  return (
    <div className="flex-1 chat-wallpaper overflow-y-auto px-3 sm:px-12 md:px-16 py-4 space-y-1">
      {/* Date Separator */}
      <div className="flex justify-center my-3 select-none">
        <span className="px-3 py-1 rounded-lg bg-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[#54656f] text-[11px] font-medium uppercase tracking-wider">
          Today
        </span>
      </div>

      {/* Messages */}
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} agent={agent} />
      ))}

      {/* WhatsApp-Style Loading / Typing Indicator */}
      {isLoading && (
        <div className="flex w-full justify-start mb-2.5 animate-fade-in">
          <div className="bg-white rounded-lg rounded-tl-none border border-[#e9edef]/60 px-4 py-3 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] flex items-center gap-1.5">
            <span className="text-xs text-[#667781] mr-1">typing</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-bounce" />
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </div>
  );
};
