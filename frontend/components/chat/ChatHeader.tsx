"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  MoreVertical,
  Bot,
  Database,
  Trash2,
  Info,
  ArrowLeft,
} from "lucide-react";
import { AgentConfig } from "@/types";

interface ChatHeaderProps {
  agent: AgentConfig;
  backendOnline: boolean;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onClearConversation?: () => void;
  onOpenAbout?: () => void;
  onToggleMobileSidebar: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  agent,
  backendOnline,
  onOpenSettings,
  onOpenMemory,
  onClearConversation,
  onOpenAbout,
  onToggleMobileSidebar,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[#e9edef] bg-[#f0f2f5] px-4 sm:px-5 sticky top-0 z-30 select-none">
      {/* Left: Agent Avatar & Status */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile toggle button */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-1.5 text-[#54656f] hover:text-[#111b21] rounded-full hover:bg-black/5"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Circular Agent Avatar */}
        <div
          onClick={onOpenSettings}
          className="relative flex-shrink-0 cursor-pointer"
          title="View Agent Information"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884]/15 border border-[#00a884]/30 text-[#00a884] shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
              backendOnline ? "bg-[#00a884]" : "bg-zinc-400"
            }`}
          />
        </div>

        {/* Agent Name & Online Status */}
        <div
          onClick={onOpenSettings}
          className="min-w-0 cursor-pointer"
          title="View Agent Information"
        >
          <h2 className="text-sm font-semibold text-[#111b21] tracking-tight truncate">
            {agent.name || "AI Assistant"}
          </h2>
          <div className="flex items-center gap-1.5 text-xs">
            {backendOnline ? (
              <span className="text-[#00a884] text-[11px] font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-pulse" />
                online
              </span>
            ) : (
              <span className="text-[#8696a0] text-[11px]">offline</span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Three-Dot Menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Chat options"
          className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
        >
          <MoreVertical className="h-5 w-5" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-12 w-52 rounded-xl bg-white shadow-lg border border-[#e9edef] py-1.5 z-50 text-xs text-[#111b21] animate-fade-in">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpenSettings();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors"
            >
              <Bot className="h-4 w-4 text-[#00a884]" />
              <span>View Agent Information</span>
            </button>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                onOpenMemory();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors"
            >
              <Database className="h-4 w-4 text-[#00a884]" />
              <span>Memory Inspector</span>
            </button>

            {onClearConversation && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onClearConversation();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-rose-50 text-rose-600 text-left transition-colors border-t border-[#e9edef]"
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
                <span>Clear conversation</span>
              </button>
            )}

            {onOpenAbout && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenAbout();
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors border-t border-[#e9edef]"
              >
                <Info className="h-4 w-4 text-[#54656f]" />
                <span>About</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
