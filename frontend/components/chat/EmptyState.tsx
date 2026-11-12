"use client";

import React from "react";
import { Lock, Sparkles, MessageSquare } from "lucide-react";
import { AgentConfig } from "@/types";

interface EmptyStateProps {
  agent: AgentConfig;
  onSelectPrompt: (prompt: string) => void;
}

const SAMPLE_STARTERS = [
  "What is our primary project milestone and tech stack?",
  "Remember that I prefer Rust for systems programming.",
  "What programming language do I prefer?",
  "Explain in two sentences what pgvector does in PostgreSQL.",
];

export const EmptyState: React.FC<EmptyStateProps> = ({
  agent,
  onSelectPrompt,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto animate-fade-in select-none">
      {/* WhatsApp-style security banner */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffffff]/80 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] text-[#54656f] text-xs font-normal mb-8">
        <Lock className="h-3 w-3 text-[#54656f] flex-shrink-0" />
        <span>End-to-end connected to Gemini & Supabase pgvector</span>
      </div>

      {/* App Illustration */}
      <div className="h-16 w-16 rounded-full bg-[#00a884]/15 flex items-center justify-center text-[#00a884] mb-4 shadow-xs">
        <MessageSquare className="h-8 w-8" />
      </div>

      <h3 className="text-xl font-bold text-[#111b21] mb-1">
        AI Messenger
      </h3>
      <p className="text-xs text-[#667781] max-w-sm mb-8 leading-relaxed">
        Send a message to start chatting with <span className="font-semibold text-[#111b21]">{agent.name || "AI Assistant"}</span>. Facts and decisions you share are stored in long-term memory.
      </p>

      {/* Quick Starters */}
      <div className="w-full space-y-2">
        <div className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
          <Sparkles className="h-3 w-3 text-[#00a884]" />
          <span>Quick Prompts</span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-left">
          {SAMPLE_STARTERS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(prompt)}
              className="p-3 rounded-xl bg-white hover:bg-[#f5f6f6] border border-[#e9edef] shadow-xs text-xs text-[#111b21] transition-all hover:border-[#00a884]/40 flex items-center justify-between group active:scale-[0.99]"
            >
              <span className="line-clamp-1">&ldquo;{prompt}&rdquo;</span>
              <span className="text-[11px] text-[#00a884] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 font-medium">
                Send &rarr;
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
