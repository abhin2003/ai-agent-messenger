"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { MessageComposer } from "@/components/chat/MessageComposer";
import { MemoryInspectorModal } from "@/components/modals/MemoryInspectorModal";
import { AgentInfoModal } from "@/components/modals/AgentInfoModal";
import { ClearConversationModal } from "@/components/modals/ClearConversationModal";
import { AboutModal } from "@/components/modals/AboutModal";
import { AgentConfig, ChatMessage, Conversation } from "@/types";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
  );
}

const DEFAULT_AGENT: AgentConfig = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "AI Assistant",
  role: "AI Assistant",
  systemPrompt:
    "You are a helpful and intelligent AI Assistant. You assist with technical tasks, research, coding, and everyday questions with accuracy, clear explanations, and context-aware memory.",
  status: "online",
  model: "gemini-3.5-flash-lite",
};

const INITIAL_CONV_ID = "00000000-0000-4000-8000-000000000001";

export default function MessengerPage() {
  const [agent, setAgent] = useState<AgentConfig>(DEFAULT_AGENT);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>(INITIAL_CONV_ID);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string>("");
  const [backendOnline, setBackendOnline] = useState<boolean>(false);

  // Modals & Navigation
  const [isAgentInfoOpen, setIsAgentInfoOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const activeIdRef = useRef(activeConversationId);
  activeIdRef.current = activeConversationId;

  // Check Backend Health on Mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "healthy") {
            setBackendOnline(true);
          }
        }
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  // Fetch Message History for a conversation from Supabase via backend
  const fetchMessagesForConv = useCallback(async (convId: string) => {
    if (!convId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/conversations/${convId}/messages`, { cache: "no-store" });
      if (res.ok) {
        const msgs = await res.json();
        if (Array.isArray(msgs) && msgs.length > 0) {
          const formatted: ChatMessage[] = msgs.map((m: any) => ({
            id: m.id,
            conversationId: convId,
            sender: m.role === "assistant" ? "agent" : "user",
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));

          setMessagesByConv((prev) => ({
            ...prev,
            [convId]: formatted,
          }));
        }
      }
    } catch {
      // Keep existing memory messages on failure
    }
  }, []);

  // Fetch Conversations from Supabase on mount or backend connect
  const loadConversations = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(`${apiUrl}/conversations?agent_id=${agent.id}`, { cache: "no-store" });
      if (res.ok) {
        const dbConvs = await res.json();
        if (Array.isArray(dbConvs)) {
          if (dbConvs.length > 0) {
            const mapped: Conversation[] = dbConvs.map((c: any) => ({
              id: c.id,
              title: c.title,
              agentId: c.agent_id,
              createdAt: new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              updatedAt: new Date(c.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              preview: c.title,
            }));
            setConversations(mapped);

            const currentActive = activeIdRef.current;
            const activeExists = mapped.some((c) => c.id === currentActive);
            const targetId = activeExists ? currentActive : mapped[0].id;
            setActiveConversationId(targetId);
            fetchMessagesForConv(targetId);
          } else {
            // No conversations in database (clean slate)
            setConversations([]);
            const freshId = generateUUID();
            setActiveConversationId(freshId);
          }
        }
      }
    } catch {
      // Backend not yet available
    }
  }, [agent.id, fetchMessagesForConv]);

  useEffect(() => {
    if (backendOnline) {
      loadConversations();
    }
  }, [backendOnline, loadConversations]);

  // Load messages when user switches conversation in sidebar
  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    fetchMessagesForConv(id);
  }, [fetchMessagesForConv]);

  // Active Messages
  const currentMessages = messagesByConv[activeConversationId] || [];

  // Create New Conversation
  const handleNewConversation = useCallback(async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const defaultTitle = "New Chat";
    const freshId = generateUUID();

    try {
      const res = await fetch(`${apiUrl}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          title: defaultTitle,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const newConv: Conversation = {
          id: created.id,
          title: created.title,
          agentId: created.agent_id,
          createdAt: new Date(created.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          updatedAt: new Date(created.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          preview: "New chat",
        };

        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
        setMessagesByConv((prev) => ({ ...prev, [newConv.id]: [] }));
        setActiveConversationId(newConv.id);
        return;
      }
    } catch {
      // Fallback local creation
    }

    const fallbackConv: Conversation = {
      id: freshId,
      title: defaultTitle,
      agentId: agent.id,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      preview: "New chat",
    };

    setConversations((prev) => [fallbackConv, ...prev]);
    setMessagesByConv((prev) => ({ ...prev, [freshId]: [] }));
    setActiveConversationId(freshId);
  }, [agent.id]);

  // Delete Individual Conversation
  const handleDeleteConversation = useCallback(
    async (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      try {
        await fetch(`${apiUrl}/conversations/${convId}`, { method: "DELETE" });
      } catch {
        // Continue local cleanup
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== convId);
        if (activeIdRef.current === convId) {
          if (filtered.length > 0) {
            setActiveConversationId(filtered[0].id);
            fetchMessagesForConv(filtered[0].id);
          } else {
            const fallbackId = generateUUID();
            setActiveConversationId(fallbackId);
          }
        }
        return filtered;
      });

      setMessagesByConv((prev) => {
        const updated = { ...prev };
        delete updated[convId];
        return updated;
      });
    },
    [fetchMessagesForConv]
  );

  // Clear Active Conversation Handler
  const handleClearCurrentConversation = useCallback(async () => {
    const currentId = activeIdRef.current;
    if (!currentId) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      await fetch(`${apiUrl}/conversations/${currentId}`, { method: "DELETE" });
    } catch {
      // Continue
    }

    setMessagesByConv((prev) => ({
      ...prev,
      [currentId]: [],
    }));

    loadConversations();
  }, [loadConversations]);

  // Send Message Handler
  const handleSendMessage = async (content: string) => {
    if (isLoading) return;

    const convId = activeConversationId;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMessage: ChatMessage = {
      id: generateUUID(),
      conversationId: convId,
      sender: "user",
      content,
      timestamp,
    };

    // 1. Immediately append user message to active conversation
    setMessagesByConv((prev) => ({
      ...prev,
      [convId]: [...(prev[convId] || []), userMessage],
    }));

    // 2. Ensure conversation item exists in sidebar and update title/preview
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convId);
      if (!exists) {
        const newConv: Conversation = {
          id: convId,
          title: content.slice(0, 32) + (content.length > 32 ? "..." : ""),
          agentId: agent.id,
          createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          updatedAt: timestamp,
          preview: content.slice(0, 48),
        };
        return [newConv, ...prev];
      }
      return prev.map((c) => {
        if (c.id === convId && (c.title === "New Chat" || c.title === "General Discussion")) {
          return {
            ...c,
            title: content.slice(0, 32) + (content.length > 32 ? "..." : ""),
            preview: content.slice(0, 48),
            updatedAt: timestamp,
          };
        } else if (c.id === convId) {
          return {
            ...c,
            preview: content.slice(0, 48),
            updatedAt: timestamp,
          };
        }
        return c;
      });
    });

    setIsLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: convId,
          message: content,
          agent: {
            id: agent.id,
            name: agent.name,
            role: agent.role,
            system_prompt: agent.systemPrompt,
            model: agent.model,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorDetail = errorData.detail || `Server error (${response.status})`;
        const systemErrorMessage: ChatMessage = {
          id: generateUUID(),
          conversationId: convId,
          sender: "system",
          content: `Backend Error (${response.status}): ${errorDetail}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessagesByConv((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), systemErrorMessage],
        }));
      } else {
        const data = await response.json();
        const returnedConvId = data.conversation_id || convId;

        const aiMessage: ChatMessage = {
          id: generateUUID(),
          conversationId: returnedConvId,
          sender: "agent",
          content: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          metadata: {
            recalledMemories: (data.recalled_memories || []).map((m: any) => ({
              id: m.id,
              content: m.content,
              memoryType: m.memory_type,
              createdAt: m.created_at,
              similarity: m.similarity,
            })),
            memoryStored: data.memory_stored,
          },
        };

        // Append AI response to messagesByConv under both convId and returnedConvId
        setMessagesByConv((prev) => {
          const list = prev[convId] || prev[returnedConvId] || [userMessage];
          const updated = [...list, aiMessage];
          return {
            ...prev,
            [convId]: updated,
            [returnedConvId]: updated,
          };
        });

        // Update preview in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId || c.id === returnedConvId
              ? {
                  ...c,
                  id: returnedConvId,
                  preview: data.response.slice(0, 48) + (data.response.length > 48 ? "..." : ""),
                  updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                }
              : c
          )
        );

        if (activeIdRef.current === convId && returnedConvId !== convId) {
          setActiveConversationId(returnedConvId);
        }
      }
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : "Network failure";
      const networkErrorMessage: ChatMessage = {
        id: generateUUID(),
        conversationId: convId,
        sender: "system",
        content: `Connection Error: Unable to reach FastAPI backend at ${apiUrl}. (${msg})`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessagesByConv((prev) => ({
        ...prev,
        [convId]: [...(prev[convId] || []), networkErrorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#efeae2] overflow-hidden antialiased">
      {/* WhatsApp Web Container */}
      <div className="flex h-full w-full bg-white shadow-lg overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentAgent={agent}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setIsAgentInfoOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Chat Workspace */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-[#efeae2]">
          {/* Header */}
          <ChatHeader
            agent={agent}
            backendOnline={backendOnline}
            onOpenSettings={() => setIsAgentInfoOpen(true)}
            onOpenMemory={() => setIsMemoryOpen(true)}
            onClearConversation={() => setIsClearModalOpen(true)}
            onOpenAbout={() => setIsAboutOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />

          {/* Messages Feed */}
          <ChatMessages
            messages={currentMessages}
            agent={agent}
            isLoading={isLoading}
            onSelectPrompt={(prompt) => setSelectedPrompt(prompt)}
          />

          {/* Message Composer */}
          <MessageComposer
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            initialValue={selectedPrompt}
            onClearInitialValue={() => setSelectedPrompt("")}
            placeholder={`Message ${agent.name}...`}
          />
        </main>
      </div>

      {/* Modals & Menus */}
      <AgentInfoModal
        isOpen={isAgentInfoOpen}
        onClose={() => setIsAgentInfoOpen(false)}
        agent={agent}
      />

      <MemoryInspectorModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        agent={agent}
      />

      <ClearConversationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearCurrentConversation}
      />

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />
    </div>
  );
}
