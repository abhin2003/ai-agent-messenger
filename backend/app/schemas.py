from typing import List, Optional
from pydantic import BaseModel, Field


class AgentConfigSchema(BaseModel):
    id: Optional[str] = Field(
        default="00000000-0000-0000-0000-000000000001",
        description="UUID of the agent",
    )
    name: str = Field(
        default="Research Assistant",
        description="Configurable display name of the agent",
    )
    role: str = Field(
        default="AI Research Assistant",
        description="Role or job title of the agent",
    )
    system_prompt: str = Field(
        default=(
            "You are a helpful AI research assistant. Explain technical concepts "
            "clearly, assist with academic research, and provide accurate and "
            "structured answers."
        ),
        description="System prompt defining behavior, instructions, and persona",
    )
    model: Optional[str] = Field(
        default="gemini-3.5-flash-lite",
        description="Optional model override; defaults to server config",
    )


class MemoryItemSchema(BaseModel):
    id: str
    content: str
    memory_type: str = "semantic_memory"
    created_at: str
    similarity: Optional[float] = None


class CreateMemoryRequest(BaseModel):
    agent_id: Optional[str] = "00000000-0000-0000-0000-000000000001"
    conversation_id: Optional[str] = None
    content: str = Field(..., min_length=1)
    memory_type: str = Field(default="semantic_memory")


class ChatRequest(BaseModel):
    conversation_id: str = Field(
        ...,
        min_length=1,
        description="Unique identifier for the conversation thread",
    )
    message: str = Field(
        ...,
        min_length=1,
        description="User message content",
    )
    agent: Optional[AgentConfigSchema] = Field(
        default=None,
        description="Configurable agent settings passed with the request",
    )


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    agent_name: str
    model: str
    recalled_memories: List[MemoryItemSchema] = []
    memory_stored: bool = False


class HealthResponse(BaseModel):
    status: str
    service: str
    provider: str
    model: str
    api_key_configured: bool
    database_connected: bool


class MessageHistoryItem(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class ConversationItem(BaseModel):
    id: str
    agent_id: str
    title: str
    created_at: str
    updated_at: str


class CreateConversationRequest(BaseModel):
    agent_id: Optional[str] = "00000000-0000-0000-0000-000000000001"
    title: str = Field(..., min_length=1, description="Conversation title")
