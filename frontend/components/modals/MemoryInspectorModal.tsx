"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Sparkles,
  Info,
} from "lucide-react";
import { AgentMemoryItem, AgentConfig } from "@/types";

interface MemoryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentConfig;
  onMemoryAdded?: () => void;
}

export const MemoryInspectorModal: React.FC<MemoryInspectorModalProps> = ({
  isOpen,
  onClose,
  agent,
  onMemoryAdded,
}) => {
  const [memories, setMemories] = useState<AgentMemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchMemories = async () => {
    setIsLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/agent/memories?agent_id=${agent.id || "00000000-0000-0000-0000-000000000001"}`);
      if (res.ok) {
        const data = await res.json();
        const formatted: AgentMemoryItem[] = (data || []).map((m: any) => ({
          id: m.id,
          content: m.content,
          memoryType: m.memory_type || "semantic_memory",
          createdAt: new Date(m.created_at).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          similarity: m.similarity,
        }));
        setMemories(formatted);
      }
    } catch {
      setStatusMessage("Failed to load memories from backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen, agent.id]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const res = await fetch(`${apiUrl}/agent/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id || "00000000-0000-0000-0000-000000000001",
          content: newContent.trim(),
          memory_type: "semantic_memory",
        }),
      });

      if (res.ok) {
        setNewContent("");
        setStatusMessage("Fact embedded & saved to Supabase pgvector!");
        fetchMemories();
        if (onMemoryAdded) onMemoryAdded();
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMessage(`Error: ${err.detail || "Failed to store memory"}`);
      }
    } catch {
      setStatusMessage("Network error: Could not reach backend");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/agent/memories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        setStatusMessage("Memory deleted from pgvector storage");
        setTimeout(() => setStatusMessage(null), 2500);
      } else {
        setStatusMessage("Failed to delete memory record");
      }
    } catch {
      setStatusMessage("Network error during memory deletion");
    }
  };

  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#e9edef] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e9edef] bg-[#f0f2f5]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[#00a884]/15 border border-[#00a884]/30 flex items-center justify-center text-[#00a884]">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111b21]">Memory Inspector</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20 font-semibold">
                  pgvector (768-dim)
                </span>
              </div>
              <p className="text-xs text-[#54656f]">
                Persistent long-term semantic embeddings for <span className="text-[#111b21] font-medium">{agent.name}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchMemories}
              disabled={isLoading}
              title="Refresh memories from Supabase"
              className="p-1.5 text-[#54656f] hover:text-[#111b21] rounded-full hover:bg-black/5 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin text-[#00a884]" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#54656f] hover:text-[#111b21] rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Status info bar */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0f2f5] border border-[#e9edef] text-xs text-[#54656f]">
            <Info className="h-4 w-4 text-[#00a884] flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-[#111b21] flex items-center gap-2">
                <span>Supabase PostgreSQL pgvector Connected</span>
                <span className="h-2 w-2 rounded-full bg-[#00a884] animate-pulse" />
              </div>
              <p className="text-[11px] text-[#54656f] mt-0.5">
                Memories are automatically retrieved via cosine similarity search when you ask relevant questions across conversations.
              </p>
            </div>
          </div>

          {/* Feedback banner */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-[#e7fed9] border border-[#00a884]/30 text-xs text-[#008069] font-medium animate-fade-in flex items-center justify-between">
              <span>{statusMessage}</span>
              <button onClick={() => setStatusMessage(null)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Ingest New Memory Form */}
          <form onSubmit={handleAddMemory} className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9edef] space-y-2.5">
            <label className="text-xs font-semibold text-[#111b21] flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-[#00a884]" />
              Store New Knowledge Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="e.g. Our project presentation date is December 15..."
                className="flex-1 rounded-lg bg-white border border-[#e9edef] px-3.5 py-2 text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newContent.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSubmitting ? "Saving..." : "Embed & Save"}</span>
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#8696a0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stored memories..."
              className="w-full rounded-lg bg-[#f0f2f5] border border-[#e9edef] pl-9 pr-3.5 py-2 text-xs text-[#111b21] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Memory List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#54656f] px-1">
              <span>Saved Memories</span>
              <span className="font-mono">{filteredMemories.length} records</span>
            </div>

            {isLoading && memories.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8696a0]">
                Loading memories from Supabase pgvector...
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-[#e9edef] bg-[#f8f9fa] text-xs text-[#8696a0]">
                No memories found. Send facts in chat or add one above!
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredMemories.map((m) => (
                  <div
                    key={m.id}
                    className="group p-3 rounded-xl bg-white border border-[#e9edef] hover:border-[#00a884]/40 hover:shadow-xs transition-all flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-[#111b21] font-medium leading-relaxed break-words">
                        &ldquo;{m.content}&rdquo;
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#8696a0]">
                        <span className="px-1.5 py-0.2 rounded bg-[#f0f2f5] font-mono text-[#54656f]">
                          {m.memoryType}
                        </span>
                        <span>{m.createdAt}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      title="Delete from pgvector"
                      className="p-1 rounded text-[#8696a0] hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-60 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f0f2f5] border-t border-[#e9edef] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008069] text-white text-xs font-medium transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
