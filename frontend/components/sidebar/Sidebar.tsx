"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  SquarePen,
  Search,
  MoreVertical,
  Database,
  Info,
  Trash2,
  X,
  Bot,
  Sparkles,
} from "lucide-react";
import { AgentConfig, Conversation } from "@/types";

interface SidebarProps {
  currentAgent: AgentConfig;
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
  onOpenMemory: () => void;
  onOpenAbout?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentAgent,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onOpenSettings,
  onOpenMemory,
  onOpenAbout,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
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

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
    c.preview.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 sm:w-96 flex-col bg-white border-r border-[#e9edef] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Header - WhatsApp Web Style */}
        <div className="flex h-16 items-center justify-between px-4 bg-[#f0f2f5] border-b border-[#e9edef]">
          {/* Logo & Name */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-[#00a884] flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-[#111b21]">AI Messenger</span>
              <span className="text-[10px] text-[#00a884] font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00a884]" />
                {currentAgent.name}
              </span>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 relative" ref={menuRef}>
            {/* New Chat Button */}
            <button
              onClick={() => {
                onNewConversation();
                onCloseMobile();
              }}
              title="New Chat"
              className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
            >
              <SquarePen className="h-5 w-5" />
            </button>

            {/* Three-Dot Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="Menu"
              className="p-2 text-[#54656f] hover:text-[#111b21] hover:bg-black/5 rounded-full transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {/* Three-Dot Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-12 w-52 rounded-xl bg-white shadow-lg border border-[#e9edef] py-1.5 z-50 text-xs text-[#111b21] animate-fade-in">
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

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors"
                >
                  <Bot className="h-4 w-4 text-[#00a884]" />
                  <span>Agent Information</span>
                </button>

                {onOpenAbout && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAbout();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-[#f5f6f6] text-left transition-colors border-t border-[#e9edef]"
                  >
                    <Info className="h-4 w-4 text-[#54656f]" />
                    <span>About AI Messenger</span>
                  </button>
                )}
              </div>
            )}

            {/* Mobile close button */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-2 text-[#54656f] hover:text-[#111b21] rounded-full hover:bg-black/5"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 bg-white border-b border-[#e9edef]">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full rounded-lg bg-[#f0f2f5] pl-10 pr-8 py-1.5 text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-[#8696a0] hover:text-[#111b21]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5]">
          {filteredConversations.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <p className="text-xs text-[#8696a0]">No chats found</p>
              <p className="text-[11px] text-[#8696a0] mt-1">
                Click the pen icon above to start a conversation.
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseMobile();
                  }}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                    isActive ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="h-11 w-11 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                      <Bot className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-sm font-semibold text-[#111b21] truncate">
                        {conv.title}
                      </h4>
                      <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-2">
                        {conv.updatedAt || conv.createdAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#667781] truncate">
                      {conv.preview || "No messages yet"}
                    </p>
                  </div>

                  {/* Delete Conversation Button (on hover) */}
                  {onDeleteConversation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.id, e);
                      }}
                      title="Delete chat"
                      className="p-1.5 text-[#8696a0] hover:text-rose-600 hover:bg-rose-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
