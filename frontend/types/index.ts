export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  avatarUrl?: string;
  status: "online" | "idle" | "offline";
  model: string;
}

export interface AgentMemoryItem {
  id: string;
  content: string;
  createdAt: string;
  memoryType: "semantic_memory" | "episodic_memory" | "profile_context";
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    memoryRecalled?: boolean;
    confidence?: number;
    tokens?: number;
    isTemporaryNotice?: boolean;
    recalledMemories?: AgentMemoryItem[];
    memoryStored?: boolean;
  };
}

export interface Conversation {
  id: string;
  title: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
}
