"use client";

import React, { useState } from "react";
import { CheckCheck, Database, Sparkles, ChevronDown, ChevronUp, Info } from "lucide-react";
import { ChatMessage, AgentConfig } from "@/types";

interface MessageItemProps {
  message: ChatMessage;
  agent: AgentConfig;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, agent }) => {
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";
  const [showMemories, setShowMemories] = useState(false);

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-1.5 max-w-md px-3 py-1 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] text-center shadow-xs">
          <Info className="h-3 w-3 text-amber-600 flex-shrink-0" />
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  const recalled = message.metadata?.recalledMemories || [];

  return (
    <div
      className={`flex w-full mb-2.5 transition-colors ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-lg px-3.5 pt-2 pb-1.5 text-sm leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] break-words ${
          isUser
            ? "bg-[#d9fdd3] text-[#111b21] rounded-tr-none"
            : "bg-white text-[#111b21] rounded-tl-none border border-[#e9edef]/60"
        }`}
      >
        {/* Message Text */}
        <div className="whitespace-pre-wrap text-[13.5px] text-[#111b21] leading-relaxed select-text">
          {message.content}
        </div>

        {/* Recalled Memory Note (Discreet & Non-Intrusive) */}
        {!isUser && recalled.length > 0 && (
          <div className="mt-2 pt-1.5 border-t border-[#e9edef] text-[11px]">
            <button
              onClick={() => setShowMemories(!showMemories)}
              className="flex items-center gap-1.5 text-[#00a884] hover:text-[#008069] font-medium transition-colors"
            >
              <Database className="h-3 w-3" />
              <span>
                {recalled.length} {recalled.length === 1 ? "memory" : "memories"} recalled
              </span>
              {showMemories ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {showMemories && (
              <div className="mt-1.5 p-2 rounded-md bg-[#f0f2f5] space-y-1 text-[#54656f] animate-fade-in">
                {recalled.map((m, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2 text-[10.5px]">
                    <span className="line-clamp-2">&ldquo;{m.content}&rdquo;</span>
                    {m.similarity !== undefined && (
                      <span className="font-mono text-[#00a884] flex-shrink-0 font-medium">
                        {Math.round(m.similarity * 100)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Memory Stored Confirmation */}
        {!isUser && message.metadata?.memoryStored && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#00a884] font-medium">
            <Sparkles className="h-2.5 w-2.5" />
            <span>Saved to long-term memory</span>
          </div>
        )}

        {/* Timestamp & Status Checkmark */}
        <div
          className={`flex items-center justify-end gap-1 mt-0.5 text-[10.5px] select-none ${
            isUser ? "text-[#667781]" : "text-[#8696a0]"
          }`}
        >
          <span>{message.timestamp}</span>
          {isUser && (
            <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] ml-0.5 inline-block" />
          )}
        </div>
      </div>
    </div>
  );
};
