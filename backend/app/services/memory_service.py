import logging
import re
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from app.config import settings
from app.services.supabase_service import supabase_service, to_valid_uuid, DEFAULT_AGENT_UUID
from app.schemas import MemoryItemSchema

logger = logging.getLogger("ai_agent_messenger")


class MemoryService:
    def __init__(self):
        self._genai_client: Optional[genai.Client] = None

    @property
    def genai_client(self) -> genai.Client:
        if self._genai_client is None:
            if not settings.gemini_api_key:
                raise ValueError("GEMINI_API_KEY is not configured in backend/.env")
            self._genai_client = genai.Client(api_key=settings.gemini_api_key)
        return self._genai_client

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generates a 768-dimensional vector embedding using Google Gemini.
        """
        try:
            res = self.genai_client.models.embed_content(
                model=settings.embedding_model,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            return list(res.embeddings[0].values)
        except Exception as e:
            logger.error(f"Error generating embedding for text: {e}")
            raise e

    def store_memory(
        self,
        agent_id: str,
        content: str,
        memory_type: str = "semantic_memory",
        conversation_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Generates embedding and persistently inserts memory into public.agent_memories,
        preventing duplicate entries.
        """
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)
        conv_uuid = to_valid_uuid(conversation_id) if conversation_id else None
        cleaned_content = content.strip()

        try:
            # Duplicate check 1: Exact text match
            existing_exact = supabase_service.client.table("agent_memories") \
                .select("id, content, memory_type, created_at") \
                .eq("agent_id", agent_uuid) \
                .ilike("content", cleaned_content) \
                .limit(1) \
                .execute()

            if existing_exact.data:
                logger.info(f"Memory already exists for agent {agent_uuid}: skipping duplicate.")
                return existing_exact.data[0]

            embedding = self.generate_embedding(cleaned_content)

            # Duplicate check 2: Near-identical semantic vector match (> 0.95 similarity)
            similar = supabase_service.client.rpc("match_agent_memories", {
                "query_embedding": embedding,
                "filter_agent_id": agent_uuid,
                "match_threshold": 0.95,
                "match_count": 1,
            }).execute()

            if similar.data:
                logger.info(f"Semantically identical memory exists (>95% match): skipping duplicate.")
                return similar.data[0]

            res = supabase_service.client.table("agent_memories").insert({
                "agent_id": agent_uuid,
                "conversation_id": conv_uuid,
                "content": cleaned_content,
                "embedding": embedding,
                "memory_type": memory_type,
            }).execute()
            logger.info(f"Successfully stored memory for agent {agent_uuid}")
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            return None

    def delete_memory(self, memory_id: str) -> bool:
        """Deletes a specific memory entry from agent_memories."""
        mem_uuid = to_valid_uuid(memory_id)
        try:
            res = supabase_service.client.table("agent_memories").delete().eq("id", mem_uuid).execute()
            return bool(res.data)
        except Exception as e:
            logger.error(f"Failed to delete memory {mem_uuid}: {e}")
            return False

    def search_memories(
        self,
        agent_id: str,
        query: str,
        threshold: float = 0.52,
        limit: int = 5,
    ) -> List[MemoryItemSchema]:
        """
        Performs semantic vector similarity search using the Supabase pgvector RPC.
        """
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)

        try:
            query_embedding = self.generate_embedding(query)
            rpc_res = supabase_service.client.rpc("match_agent_memories", {
                "query_embedding": query_embedding,
                "filter_agent_id": agent_uuid,
                "match_threshold": threshold,
                "match_count": limit,
            }).execute()

            results = []
            for row in (rpc_res.data or []):
                results.append(
                    MemoryItemSchema(
                        id=str(row.get("id")),
                        content=str(row.get("content")),
                        memory_type=str(row.get("memory_type", "semantic_memory")),
                        created_at=str(row.get("created_at")),
                        similarity=round(float(row.get("similarity", 0.0)), 4),
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Failed to search memories: {e}")
            return []

    def list_memories(self, agent_id: str, limit: int = 30) -> List[MemoryItemSchema]:
        """
        Fetches the latest memories for the agent (used in the Memory Inspector modal).
        """
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)
        try:
            res = supabase_service.client.table("agent_memories") \
                .select("id, content, memory_type, created_at") \
                .eq("agent_id", agent_uuid) \
                .order("created_at", desc=True) \
                .limit(limit) \
                .execute()

            results = []
            for row in (res.data or []):
                results.append(
                    MemoryItemSchema(
                        id=str(row["id"]),
                        content=str(row["content"]),
                        memory_type=str(row.get("memory_type", "semantic_memory")),
                        created_at=str(row.get("created_at")),
                    )
                )
            return results
        except Exception as e:
            logger.error(f"Failed to list memories: {e}")
            return []

    @staticmethod
    def extract_memory_intent(text: str) -> Optional[str]:
        """
        Detects if user message contains an explicit instruction, fact, or decision to remember.
        e.g., 'Remember that I prefer Rust', 'Our project deadline is December 15',
        'My preferred response style is concise', 'We decided to use Supabase for persistent memory'
        """
        cleaned = text.strip()
        patterns = [
            # Explicit remember commands
            r"(?:remember\s+(?:that|this)?|please\s+remember\s+(?:that)?|keep\s+in\s+mind\s+(?:that)?|note\s+(?:down\s+)?that|save\s+(?:to\s+memory\s+)?that)\s+(.*)",
            # Decisions
            r"(?:our\s+decision\s+is\s+(?:that)?|we\s+decided\s+(?:to|that)?)\s+(.*)",
            # Deadlines & milestones
            r"((?:our|the)?\s*project\s+deadline\s+is\s+.*)",
            # Preferences
            r"(my\s+preferred\s+(?:programming\s+language|language|response\s+style|style|stack)\s+is\s+.*)",
            r"(my\s+current\s+project\s+is\s+.*)",
            # Codename assertions
            r"(my\s+project\s+codename\s+is\s+.*)",
        ]
        for p in patterns:
            match = re.search(p, cleaned, re.IGNORECASE)
            if match:
                extracted = match.group(1).strip(" :,-.")
                if len(extracted) > 4:
                    return extracted

        # Catch full declarative sentences stating user preferences/projects
        if re.search(r"preferred\s+programming\s+language|project\s+codename|project\s+deadline", cleaned, re.IGNORECASE):
            return cleaned

        return None


memory_service = MemoryService()
