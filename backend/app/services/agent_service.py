import asyncio
import logging
from typing import Tuple, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings
from app.schemas import AgentConfigSchema, MemoryItemSchema
from app.services.memory_service import memory_service

logger = logging.getLogger("ai_agent_messenger")


class AgentService:
    @staticmethod
    def is_configured() -> bool:
        return bool(settings.gemini_api_key and settings.gemini_api_key.strip())

    @classmethod
    async def generate_response(
        cls,
        user_message: str,
        agent_config: AgentConfigSchema,
        conversation_id: str = None,
    ) -> Tuple[str, str, List[MemoryItemSchema], bool]:
        """
        Executes a real LangChain ChatGoogleGenerativeAI call with dynamic persona,
        pgvector semantic memory recall, and automatic memory ingestion.
        Returns (response_text, model_name, recalled_memories, memory_stored).
        """
        if not cls.is_configured():
            raise ValueError(
                "GEMINI_API_KEY is not configured on the server. "
                "Please configure a valid Google Gemini API key in backend/.env."
            )

        requested_model = agent_config.model or settings.llm_model
        agent_id = agent_config.id or "00000000-0000-0000-0000-000000000001"

        # 1. Semantic Memory Retrieval via pgvector (run in thread pool)
        recalled_memories: List[MemoryItemSchema] = []
        try:
            recalled_memories = await asyncio.to_thread(
                memory_service.search_memories,
                agent_id=agent_id,
                query=user_message,
                threshold=0.55,
                limit=3,
            )
        except Exception as e:
            logger.warning(f"Could not retrieve semantic memories: {e}")

        # 2. Construct System Instruction with Recalled Memories
        memory_context = ""
        if recalled_memories:
            memory_lines = [
                f"- [{m.memory_type}] {m.content} (match: {int((m.similarity or 0) * 100)}%)"
                for m in recalled_memories
            ]
            memory_context = (
                "\n\n=== RECALLED SEMANTIC MEMORIES (pgvector) ===\n"
                "The following verified facts/decisions from long-term memory are relevant to the user query:\n"
                + "\n".join(memory_lines)
                + "\nUse these recalled memories to provide an accurate, context-aware response.\n"
                "============================================="
            )

        system_instruction = (
            f"You are {agent_config.name}, working as a professional {agent_config.role}.\n"
            f"{agent_config.system_prompt}"
            f"{memory_context}"
        )

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=user_message),
        ]

        # 3. Model invocation with resilient fallback across supported Gemini models
        candidate_models = []
        for m in [requested_model, "gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.5-flash"]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        last_error = None
        response_text = ""
        model_used = requested_model

        for model_candidate in candidate_models:
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_candidate,
                    google_api_key=settings.gemini_api_key,
                    temperature=0.7,
                    max_retries=1,
                )
                ai_message = await llm.ainvoke(messages)
                response_text = str(ai_message.content) if ai_message.content else ""
                model_used = model_candidate
                last_error = None
                break
            except Exception as e:
                err_str = str(e)
                last_error = e
                logger.warning(f"Model {model_candidate} failed ({err_str[:120]}). Trying next candidate.")
                continue

        if last_error is not None and not response_text:
            raise last_error

        # 4. Check for Memory Extraction Intent (run in thread pool)
        memory_stored = False
        memory_content = memory_service.extract_memory_intent(user_message)
        if memory_content:
            stored = await asyncio.to_thread(
                memory_service.store_memory,
                agent_id=agent_id,
                content=memory_content,
                memory_type="semantic_memory",
                conversation_id=conversation_id,
            )
            if stored:
                memory_stored = True

        return response_text, model_used, recalled_memories, memory_stored


agent_service = AgentService()
