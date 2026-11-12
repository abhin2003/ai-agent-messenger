import logging
import uuid
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from app.config import settings
from app.schemas import AgentConfigSchema

logger = logging.getLogger("ai_agent_messenger")

# Namespace for generating deterministic UUIDs from string IDs
APP_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
DEFAULT_AGENT_UUID = "00000000-0000-0000-0000-000000000001"


def to_valid_uuid(val: Optional[str], default_val: Optional[str] = None) -> str:
    """Ensures any arbitrary string ID is converted into a valid UUID string."""
    if not val:
        return default_val or str(uuid.uuid4())
    try:
        return str(uuid.UUID(val))
    except (ValueError, AttributeError):
        return str(uuid.uuid5(APP_NAMESPACE, str(val)))


class SupabaseService:
    def __init__(self):
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        if self._client is None:
            if not settings.supabase_url or not settings.supabase_secret_key:
                raise ValueError("Supabase URL and Secret Key must be configured in backend/.env")
            self._client = create_client(settings.supabase_url, settings.supabase_secret_key)
        return self._client

    def is_connected(self) -> bool:
        """Verifies live connectivity to Supabase."""
        try:
            if not settings.supabase_url or not settings.supabase_secret_key:
                return False
            res = self.client.table("agents").select("id").limit(1).execute()
            return res.data is not None
        except Exception as e:
            logger.warning(f"Supabase connectivity check failed: {e}")
            return False

    def ensure_agent(self, agent_config: AgentConfigSchema) -> str:
        """Ensures the agent exists in the agents table."""
        agent_uuid = to_valid_uuid(agent_config.id, default_val=DEFAULT_AGENT_UUID)
        try:
            payload = {
                "id": agent_uuid,
                "name": agent_config.name,
                "role": agent_config.role,
                "system_prompt": agent_config.system_prompt,
            }
            self.client.table("agents").upsert(payload).execute()
            return agent_uuid
        except Exception as e:
            logger.error(f"Failed to upsert agent {agent_uuid}: {e}")
            return agent_uuid

    def ensure_conversation(self, conversation_id: str, agent_id: str, title: str = "New Discussion") -> str:
        """Ensures the conversation thread exists in the conversations table."""
        conv_uuid = to_valid_uuid(conversation_id)
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)

        try:
            existing = self.client.table("conversations").select("id").eq("id", conv_uuid).execute()
            if not existing.data:
                self.client.table("conversations").insert({
                    "id": conv_uuid,
                    "agent_id": agent_uuid,
                    "title": title[:100],
                }).execute()
            return conv_uuid
        except Exception as e:
            logger.error(f"Failed to ensure conversation {conv_uuid}: {e}")
            return conv_uuid

    def list_conversations(self, agent_id: str) -> List[Dict[str, Any]]:
        """Lists conversations for an agent ordered by last update."""
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)
        try:
            res = self.client.table("conversations") \
                .select("id, agent_id, title, created_at, updated_at") \
                .eq("agent_id", agent_uuid) \
                .order("updated_at", desc=True) \
                .execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Failed to list conversations for agent {agent_uuid}: {e}")
            return []

    def create_conversation(self, agent_id: str, title: str = "New Discussion") -> Optional[Dict[str, Any]]:
        """Creates a new conversation record."""
        agent_uuid = to_valid_uuid(agent_id, default_val=DEFAULT_AGENT_UUID)
        new_id = str(uuid.uuid4())
        try:
            res = self.client.table("conversations").insert({
                "id": new_id,
                "agent_id": agent_uuid,
                "title": title[:100],
            }).execute()
            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Failed to create conversation: {e}")
            return None

    def delete_conversation(self, conversation_id: str) -> bool:
        """Deletes a conversation and its messages (cascade delete)."""
        conv_uuid = to_valid_uuid(conversation_id)
        try:
            res = self.client.table("conversations").delete().eq("id", conv_uuid).execute()
            return bool(res.data)
        except Exception as e:
            logger.error(f"Failed to delete conversation {conv_uuid}: {e}")
            return False

    def save_message(self, conversation_id: str, role: str, content: str) -> Optional[Dict[str, Any]]:
        """Saves a user or assistant message to dialogue history and updates conversation updated_at."""
        conv_uuid = to_valid_uuid(conversation_id)
        try:
            res = self.client.table("messages").insert({
                "conversation_id": conv_uuid,
                "role": role,
                "content": content,
            }).execute()

            # Touch conversation updated_at
            try:
                self.client.table("conversations").update({"updated_at": "now()"}).eq("id", conv_uuid).execute()
            except Exception:
                pass

            return res.data[0] if res.data else None
        except Exception as e:
            logger.error(f"Failed to save message to conversation {conv_uuid}: {e}")
            return None

    def get_conversation_messages(self, conversation_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves chronological dialogue history."""
        conv_uuid = to_valid_uuid(conversation_id)
        try:
            res = self.client.table("messages") \
                .select("id, role, content, created_at") \
                .eq("conversation_id", conv_uuid) \
                .order("created_at", desc=False) \
                .limit(limit) \
                .execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Failed to fetch messages for conversation {conv_uuid}: {e}")
            return []


supabase_service = SupabaseService()
