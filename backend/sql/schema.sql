-- ============================================================================
-- AI Agent Messenger — Database & pgvector Schema
-- Architecture: Supabase PostgreSQL + pgvector (768 dimensions for Gemini Embeddings)
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Agents Table
-- Stores configurable autonomous AI agent personas
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Conversations Table
-- Stores conversation threads linked to specific agents
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id 
    ON public.conversations(agent_id);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
    ON public.conversations(updated_at DESC);

-- 4. Messages Table
-- Stores chronological dialogue history
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
    ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
    ON public.messages(created_at ASC);

-- 5. Agent Memories Table (pgvector)
-- Stores persistent facts, decisions, and context embeddings (768 dimensions)
CREATE TABLE IF NOT EXISTS public.agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    memory_type TEXT NOT NULL CHECK (memory_type IN ('semantic_memory', 'episodic_memory', 'profile_context')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for agent memories
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent_id 
    ON public.agent_memories(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_memories_created_at 
    ON public.agent_memories(created_at DESC);

-- HNSW Vector Index for Cosine Similarity Search (<=> operator)
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding 
    ON public.agent_memories 
    USING hnsw (embedding vector_cosine_ops);

-- 6. Row Level Security (RLS)
-- Enabled on all tables. Server-side backend accesses via Supabase Secret Key.
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memories ENABLE ROW LEVEL SECURITY;

-- 7. Semantic Search Function (RPC)
-- Performs cosine similarity search strictly isolated per agent
CREATE OR REPLACE FUNCTION public.match_agent_memories (
    query_embedding vector(768),
    filter_agent_id UUID,
    match_threshold FLOAT DEFAULT 0.0,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    memory_type TEXT,
    created_at TIMESTAMPTZ,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        m.memory_type,
        m.created_at,
        (1 - (m.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.agent_memories m
    WHERE m.agent_id = filter_agent_id
      AND (1 - (m.embedding <=> query_embedding)) >= match_threshold
    ORDER BY m.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;

-- 8. Seed Default Agent (Idempotent)
-- Inserts default Research Assistant persona without creating duplicates
INSERT INTO public.agents (id, name, role, system_prompt)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Research Assistant',
    'AI Research Assistant',
    'You are a helpful AI research assistant. Explain technical concepts clearly, assist with academic research, and provide accurate and structured answers.'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    system_prompt = EXCLUDED.system_prompt,
    updated_at = now();

