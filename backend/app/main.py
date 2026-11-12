import asyncio
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import (
    AgentConfigSchema,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    MemoryItemSchema,
    CreateMemoryRequest,
    MessageHistoryItem,
    ConversationItem,
    CreateConversationRequest,
)
from app.services.agent_service import agent_service
from app.services.supabase_service import supabase_service, DEFAULT_AGENT_UUID
from app.services.memory_service import memory_service

logger = logging.getLogger("ai_agent_messenger")

app = FastAPI(
    title="AI Agent Messenger API",
    description="The Operating System for AI Employees — LangChain + Gemini + Supabase pgvector",
    version="0.4.5",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "name": "AI Agent Messenger API",
        "status": "online",
        "version": "0.4.5",
        "provider": "gemini",
        "vector_database": "supabase-pgvector",
        "docs_url": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
def read_health():
    return HealthResponse(
        status="healthy",
        service="backend",
        provider=settings.llm_provider,
        model=settings.llm_model,
        api_key_configured=agent_service.is_configured(),
        database_connected=supabase_service.is_connected(),
    )


@app.get("/agent", response_model=AgentConfigSchema)
def get_default_agent():
    return AgentConfigSchema(
        id=DEFAULT_AGENT_UUID,
        name="Research Assistant",
        role="AI Research Assistant",
        system_prompt=(
            "You are a helpful AI research assistant. Explain technical concepts "
            "clearly, assist with academic research, and provide accurate and "
            "structured answers."
        ),
        model=settings.llm_model,
    )


@app.post("/chat", response_model=ChatResponse)
async def chat_with_agent(payload: ChatRequest):
    agent_config = payload.agent or AgentConfigSchema()

    try:
        # 1. Ensure Agent & Conversation exist in Supabase (run in thread pool)
        agent_uuid = await asyncio.to_thread(supabase_service.ensure_agent, agent_config)
        conv_uuid = await asyncio.to_thread(
            supabase_service.ensure_conversation,
            conversation_id=payload.conversation_id,
            agent_id=agent_uuid,
            title=payload.message[:45],
        )

        # 2. Persist User Message to Dialogue History (run in thread pool)
        await asyncio.to_thread(
            supabase_service.save_message,
            conversation_id=conv_uuid,
            role="user",
            content=payload.message,
        )

        # 3. Generate Agent Response with Semantic Memory Recall
        response_text, model_used, recalled_memories, memory_stored = await agent_service.generate_response(
            user_message=payload.message,
            agent_config=agent_config,
            conversation_id=conv_uuid,
        )

        # 4. Persist Assistant Response to Dialogue History (run in thread pool)
        await asyncio.to_thread(
            supabase_service.save_message,
            conversation_id=conv_uuid,
            role="assistant",
            content=response_text,
        )

        return ChatResponse(
            conversation_id=conv_uuid,
            response=response_text,
            agent_name=agent_config.name,
            model=model_used,
            recalled_memories=recalled_memories,
            memory_stored=memory_stored,
        )
    except ValueError as e:
        logger.error(f"Configuration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error during agent generation: {error_msg}")
        if "API_KEY_INVALID" in error_msg or "API key not valid" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google Gemini authentication failed: Invalid API key.",
            )
        elif "RESOURCE_EXHAUSTED" in error_msg or "429" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Google Gemini quota or rate limit exceeded.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agent service error: {error_msg}",
            )


# ============================================================================
# CONVERSATIONS MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/conversations", response_model=List[ConversationItem])
async def list_conversations(
    agent_id: str = Query(default=DEFAULT_AGENT_UUID, description="Agent UUID"),
):
    """Retrieves all conversation threads for an agent."""
    raw = await asyncio.to_thread(supabase_service.list_conversations, agent_id=agent_id)
    return [
        ConversationItem(
            id=str(c["id"]),
            agent_id=str(c["agent_id"]),
            title=str(c["title"]),
            created_at=str(c["created_at"]),
            updated_at=str(c.get("updated_at") or c["created_at"]),
        )
        for c in raw
    ]


@app.post("/conversations", response_model=ConversationItem)
async def create_conversation(payload: CreateConversationRequest):
    """Creates a new conversation thread."""
    created = await asyncio.to_thread(
        supabase_service.create_conversation,
        agent_id=payload.agent_id or DEFAULT_AGENT_UUID,
        title=payload.title,
    )
    if not created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation.",
        )
    return ConversationItem(
        id=str(created["id"]),
        agent_id=str(created["agent_id"]),
        title=str(created["title"]),
        created_at=str(created["created_at"]),
        updated_at=str(created.get("updated_at") or created["created_at"]),
    )


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Deletes a conversation and its messages via cascading deletion."""
    deleted = await asyncio.to_thread(supabase_service.delete_conversation, conversation_id=conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation {conversation_id} not found or already deleted.",
        )
    return {"status": "deleted", "conversation_id": conversation_id}


@app.get("/conversations/{conversation_id}/messages", response_model=List[MessageHistoryItem])
async def get_conversation_history(conversation_id: str):
    """Retrieves stored message history from Supabase."""
    raw_messages = await asyncio.to_thread(supabase_service.get_conversation_messages, conversation_id=conversation_id)
    return [
        MessageHistoryItem(
            id=str(m["id"]),
            role=str(m["role"]),
            content=str(m["content"]),
            created_at=str(m["created_at"]),
        )
        for m in raw_messages
    ]


# ============================================================================
# SEMANTIC MEMORY MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/agent/memories", response_model=List[MemoryItemSchema])
async def get_agent_memories(
    agent_id: str = Query(default=DEFAULT_AGENT_UUID, description="Agent UUID"),
    limit: int = Query(default=30, ge=1, le=100),
):
    """Fetches persistent semantic memories for the agent."""
    return await asyncio.to_thread(memory_service.list_memories, agent_id=agent_id, limit=limit)


@app.get("/agent/memories/search", response_model=List[MemoryItemSchema])
async def search_agent_memories(
    query: str = Query(..., min_length=1, description="Search query string"),
    agent_id: str = Query(default=DEFAULT_AGENT_UUID, description="Agent UUID"),
    threshold: float = Query(default=0.45, ge=0.0, le=1.0),
    limit: int = Query(default=5, ge=1, le=20),
):
    """Performs semantic similarity search against the agent's memory bank."""
    return await asyncio.to_thread(
        memory_service.search_memories,
        agent_id=agent_id,
        query=query,
        threshold=threshold,
        limit=limit,
    )


@app.post("/agent/memories", response_model=MemoryItemSchema)
async def create_agent_memory(payload: CreateMemoryRequest):
    """Explicitly adds a new persistent memory with vector embedding."""
    stored = await asyncio.to_thread(
        memory_service.store_memory,
        agent_id=payload.agent_id or DEFAULT_AGENT_UUID,
        content=payload.content,
        memory_type=payload.memory_type,
        conversation_id=payload.conversation_id,
    )
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate embedding or persist memory in Supabase pgvector.",
        )
    return MemoryItemSchema(
        id=str(stored["id"]),
        content=str(stored["content"]),
        memory_type=str(stored.get("memory_type", "semantic_memory")),
        created_at=str(stored.get("created_at")),
    )


@app.delete("/agent/memories/{memory_id}")
async def delete_agent_memory(memory_id: str):
    """Deletes a memory entry from pgvector storage."""
    deleted = await asyncio.to_thread(memory_service.delete_memory, memory_id=memory_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Memory {memory_id} not found or already deleted.",
        )
    return {"status": "deleted", "memory_id": memory_id}
