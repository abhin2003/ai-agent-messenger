"use client";

import React from "react";
import { X, Bot, Sparkles, Brain, Cpu } from "lucide-react";
import { AgentConfig } from "@/types";

interface AgentInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentConfig;
}

export const AgentInfoModal: React.FC<AgentInfoModalProps> = ({
  isOpen,
  onClose,
  agent,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#e9edef] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#f0f2f5] border-b border-[#e9edef]">
          <h3 className="text-base font-semibold text-[#111b21]">Agent Information</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm text-[#3b4a54]">
          {/* Avatar & Title */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#00a884]/15 border-2 border-[#00a884]/30 flex items-center justify-center text-[#00a884]">
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-[#111b21]">{agent.name}</h4>
              <p className="text-xs text-[#00a884] font-medium flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-[#00a884] animate-pulse" />
                {agent.role}
              </p>
            </div>
          </div>

          {/* Model info */}
          <div className="p-3 rounded-xl bg-[#f0f2f5] border border-[#e9edef] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#00a884]" />
              <span className="text-xs font-medium text-[#111b21]">Intelligence Engine</span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-[#54656f] border border-[#e9edef]">
              {agent.model}
            </span>
          </div>

          {/* Persona & System Prompt */}
          <div>
            <label className="text-xs font-semibold text-[#54656f] uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-[#00a884]" />
              System Instructions
            </label>
            <div className="p-3.5 rounded-xl bg-[#f8f9fa] border border-[#e9edef] text-xs text-[#3b4a54] leading-relaxed max-h-48 overflow-y-auto">
              {agent.systemPrompt}
            </div>
          </div>

          {/* Vector Memory capability note */}
          <div className="flex items-center gap-2 text-xs text-[#54656f] pt-1 border-t border-[#e9edef]">
            <Sparkles className="h-3.5 w-3.5 text-[#00a884] flex-shrink-0" />
            <span>Persistent semantic memory enabled via Supabase pgvector.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#f0f2f5] border-t border-[#e9edef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008069] text-white text-xs font-medium transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

