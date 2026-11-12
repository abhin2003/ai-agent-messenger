"use client";

import React from "react";
import { X, MessageSquare, ShieldCheck, Database, Sparkles } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-[#e9edef] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#f0f2f5] border-b border-[#e9edef]">
          <h3 className="text-base font-semibold text-[#111b21]">About AI Messenger</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#54656f] hover:text-[#111b21] hover:bg-black/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-[#3b4a54] leading-relaxed">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#00a884] flex items-center justify-center text-white shadow-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111b21]">AI Messenger OS</h4>
              <p className="text-[11px] text-[#54656f]">The Operating System for AI Employees</p>
            </div>
          </div>

          <p>
            AI Messenger provides an intuitive, distraction-free messaging interface for interacting with autonomous AI employees. Powered by real-time reasoning models and long-term memory.
          </p>

          <div className="space-y-2 pt-2 border-t border-[#e9edef]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#00a884]" />
              <span className="font-medium text-[#111b21]">Intelligence:</span>
              <span className="text-[#54656f]">Google Gemini via LangChain</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#00a884]" />
              <span className="font-medium text-[#111b21]">Memory:</span>
              <span className="text-[#54656f]">Supabase PostgreSQL + pgvector (768-dim)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00a884]" />
              <span className="font-medium text-[#111b21]">Architecture:</span>
              <span className="text-[#54656f]">Next.js 16 App Router & FastAPI</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#f0f2f5] border-t border-[#e9edef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008069] text-white text-xs font-medium transition-colors shadow-xs"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

