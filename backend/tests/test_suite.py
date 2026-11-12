import sys
import os
import json
import time
import urllib.request
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"

def http_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def http_post(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body

def http_delete(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, body


# ============================================================================
# SUITE 1: CONVERSATION PERSISTENCE (PHASE 1)
# ============================================================================
def run_persistence_phase1():
    print("--- [Suite 1 Phase 1] Creating 3 Conversations & Sending Messages ---")
    convs = []
    for i in range(1, 4):
        # Create conversation
        title = f"Test Discussion {i} - Persistence Verification"
        status, conv = http_post("/conversations", {"title": title})
        assert status == 200, f"Failed to create conversation {i}: {conv}"
        conv_id = conv["id"]
        print(f"Created Conversation {i}: ID={conv_id}, Title='{title}'")

        # Send 2 chat messages
        msg1 = f"Message 1 in conversation {i}: Hello Research Assistant."
        s1, res1 = http_post("/chat", {"conversation_id": conv_id, "message": msg1})
        assert s1 == 200, f"Failed chat 1 in conv {i}: {res1}"

        msg2 = f"Message 2 in conversation {i}: Please summarize your role in one sentence."
        s2, res2 = http_post("/chat", {"conversation_id": conv_id, "message": msg2})
        assert s2 == 200, f"Failed chat 2 in conv {i}: {res2}"

        # Fetch messages to record baseline
        s_m, msgs = http_get(f"/conversations/{conv_id}/messages")
        assert s_m == 200
        print(f"Conversation {i} currently has {len(msgs)} messages stored.")
        convs.append({"id": conv_id, "title": title, "msg_count": len(msgs)})

    with open("backend/tests/persistence_convs.json", "w") as f:
        json.dump(convs, f)
    print("Phase 1 completed successfully. Ready for server restart.")


# ============================================================================
# SUITE 1: CONVERSATION PERSISTENCE (PHASE 2 - AFTER RESTART)
# ============================================================================
def run_persistence_phase2():
    print("--- [Suite 1 Phase 2] Verifying Persistence After FastAPI Restart ---")
    with open("backend/tests/persistence_convs.json") as f:
        convs = json.load(f)

    # 1. Verify all conversations exist in listing
    s_list, all_convs = http_get("/conversations")
    assert s_list == 200, f"Failed to list conversations: {all_convs}"
    existing_ids = {c["id"] for c in all_convs}

    for c in convs:
        cid = c["id"]
        assert cid in existing_ids, f"Conversation {cid} missing from list after restart!"
        print(f"Verified conversation {cid} exists in Supabase.")

        # 2. Verify messages remain available
        s_m, msgs = http_get(f"/conversations/{cid}/messages")
        assert s_m == 200, f"Failed to get messages for {cid}: {msgs}"
        assert len(msgs) == c["msg_count"], f"Message count mismatch for {cid}: expected {c['msg_count']}, got {len(msgs)}"

        # 3. Verify no duplicated message IDs
        msg_ids = [m["id"] for m in msgs]
        assert len(msg_ids) == len(set(msg_ids)), f"Duplicate message IDs found in conversation {cid}!"

        # 4. Verify conversation switching returns the specific conversation's messages
        user_msgs = [m["content"] for m in msgs if m["role"] == "user"]
        assert any(c["title"][:15] in m or "Message 1 in conversation" in m for m in user_msgs)
        print(f"Verified {len(msgs)} messages persisted with 0 duplicates for conversation {cid}.")

    print("PASS: Suite 1 Conversation Persistence verified after server restart.")


# ============================================================================
# SUITE 2: SEMANTIC MEMORY TESTING
# ============================================================================
def run_semantic_memory_test():
    print("\n--- [Suite 2] Semantic Memory Testing ---")
    # Step 1: Create Conversation A
    s_ca, conv_a = http_post("/conversations", {"title": "Discussion A - Knowledge Imparting"})
    assert s_ca == 200
    conv_a_id = conv_a["id"]
    print(f"Conversation A created: {conv_a_id}")

    # Tell the Research Assistant
    fact = "My preferred programming language is Rust. My current project is AI Agent Messenger, built using Gemini, LangChain and Supabase."
    print(f"Sending fact in Conversation A: '{fact}'")
    s_chat1, res_chat1 = http_post("/chat", {
        "conversation_id": conv_a_id,
        "message": fact
    })
    assert s_chat1 == 200, f"Chat in Conv A failed: {res_chat1}"
    print(f"Chat A response: {res_chat1['response'][:100]}... (memory_stored: {res_chat1.get('memory_stored')})")

    # Verify that memory is stored in Supabase
    s_mem, memories = http_get("/agent/memories?limit=20")
    assert s_mem == 200
    matched = [m for m in memories if "Rust" in m["content"] or "AI Agent Messenger" in m["content"]]
    assert len(matched) > 0, "Fact was not found in agent_memories in Supabase!"
    print(f"Verified fact stored in Supabase agent_memories: ID={matched[0]['id']}, Content='{matched[0]['content']}'")

    # Step 2: Create Conversation B with the same agent
    s_cb, conv_b = http_post("/conversations", {"title": "Discussion B - Memory Recall"})
    assert s_cb == 200
    conv_b_id = conv_b["id"]
    print(f"Conversation B created: {conv_b_id}")

    # Ask the agent
    query = "What programming language do I prefer? What project am I building?"
    print(f"Asking in Conversation B: '{query}'")
    s_chat2, res_chat2 = http_post("/chat", {
        "conversation_id": conv_b_id,
        "message": query
    })
    assert s_chat2 == 200, f"Chat in Conv B failed: {res_chat2}"
    
    recalled = res_chat2.get("recalled_memories", [])
    print(f"Recalled memories returned: {len(recalled)}")
    for r in recalled:
        print(f"  - Recalled: '{r['content']}' (similarity: {r.get('similarity')})")

    assert len(recalled) > 0, "No memories were recalled by pgvector similarity search!"
    assert any("Rust" in r["content"] or "AI Agent Messenger" in r["content"] for r in recalled), "Relevant memory not in recalled list!"

    # Verify Gemini response mentions Rust and AI Agent Messenger
    response_text = res_chat2["response"].lower()
    print(f"Gemini Answer in Conversation B:\n{res_chat2['response']}\n")
    assert "rust" in response_text, f"Gemini response did not mention Rust: {res_chat2['response']}"
    assert "ai agent messenger" in response_text or "messenger" in response_text, f"Gemini response did not mention AI Agent Messenger: {res_chat2['response']}"

    print("PASS: Suite 2 Semantic Memory (storage, pgvector RPC recall, context injection, Gemini verification) PASSED.")


# ============================================================================
# SUITE 3: AGENT ISOLATION TESTING
# ============================================================================
def run_agent_isolation_test():
    print("\n--- [Suite 3] Agent Isolation Testing ---")
    agent_a_id = "11111111-1111-1111-1111-111111111111"
    agent_b_id = "22222222-2222-2222-2222-222222222222"

    agent_a_config = {
        "id": agent_a_id,
        "name": "Alpha Analyst",
        "role": "Mission Specialist",
        "system_prompt": "You are Alpha Analyst.",
        "model": "gemini-3.5-flash-lite"
    }

    agent_b_config = {
        "id": agent_b_id,
        "name": "Beta Engineer",
        "role": "Systems Architect",
        "system_prompt": "You are Beta Engineer.",
        "model": "gemini-3.5-flash-lite"
    }

    # Store memory for Agent A
    s_a1, r_a1 = http_post("/chat", {
        "conversation_id": str(uuid.uuid4()),
        "message": "Remember this fact: My project codename is ALPHA-739.",
        "agent": agent_a_config
    })
    assert s_a1 == 200, f"Agent A store chat failed: {r_a1}"
    print(f"Agent A stored codename: ALPHA-739 (memory_stored: {r_a1.get('memory_stored')})")

    # Store memory for Agent B
    s_b1, r_b1 = http_post("/chat", {
        "conversation_id": str(uuid.uuid4()),
        "message": "Remember this fact: My project codename is BETA-284.",
        "agent": agent_b_config
    })
    assert s_b1 == 200, f"Agent B store chat failed: {r_b1}"
    print(f"Agent B stored codename: BETA-284 (memory_stored: {r_b1.get('memory_stored')})")

    time.sleep(1)

    # Query Agent A for its project codename
    print("Querying Agent A: 'What is my project codename?'")
    s_a2, r_a2 = http_post("/chat", {
        "conversation_id": str(uuid.uuid4()),
        "message": "What is my project codename?",
        "agent": agent_a_config
    })
    assert s_a2 == 200, f"Agent A query failed: {r_a2}"
    a2_memories = [m["content"] for m in r_a2.get("recalled_memories", [])]
    print(f"Agent A recalled memories: {a2_memories}")
    print(f"Agent A response: {r_a2['response']}")

    # Query Agent B for its project codename
    print("Querying Agent B: 'What is my project codename?'")
    s_b2, r_b2 = http_post("/chat", {
        "conversation_id": str(uuid.uuid4()),
        "message": "What is my project codename?",
        "agent": agent_b_config
    })
    assert s_b2 == 200, f"Agent B query failed: {r_b2}"
    b2_memories = [m["content"] for m in r_b2.get("recalled_memories", [])]
    print(f"Agent B recalled memories: {b2_memories}")
    print(f"Agent B response: {r_b2['response']}")

    # Strict isolation checks
    assert any("ALPHA-739" in m for m in a2_memories), "Agent A failed to recall ALPHA-739!"
    assert not any("BETA-284" in m for m in a2_memories), "ISOLATION BREACH: Agent A recalled Agent B's memory BETA-284!"

    assert any("BETA-284" in m for m in b2_memories), "Agent B failed to recall BETA-284!"
    assert not any("ALPHA-739" in m for m in b2_memories), "ISOLATION BREACH: Agent B recalled Agent A's memory ALPHA-739!"

    print("PASS: Suite 3 Agent Isolation strictly verified. Zero cross-agent memory contamination.")


# ============================================================================
# SUITE 4: MEMORY INSPECTOR CRUD & ERROR HANDLING
# ============================================================================
def run_memory_inspector_test():
    print("\n--- [Suite 4] Memory Inspector CRUD & Search Testing ---")
    # 1. Load memories
    s_list, memories = http_get("/agent/memories?limit=10")
    assert s_list == 200, f"Failed to list memories: {memories}"
    print(f"Loaded {len(memories)} existing memories for default agent.")

    # 2. Add memory manually
    test_fact = f"Manual knowledge entry: Quantum computing qubits operate at cryogenic temperatures - {uuid.uuid4().hex[:6]}"
    s_add, created_mem = http_post("/agent/memories", {
        "content": test_fact,
        "memory_type": "profile_context"
    })
    assert s_add == 200, f"Failed to manually add memory: {created_mem}"
    mem_id = created_mem["id"]
    print(f"Manually added memory: ID={mem_id}, Type={created_mem['memory_type']}")

    # 3. Search memories
    s_search, search_results = http_get("/agent/memories/search?query=cryogenic+temperatures+quantum")
    assert s_search == 200, f"Failed to search memories: {search_results}"
    found_ids = [m["id"] for m in search_results]
    print(f"Search results for 'cryogenic temperatures quantum': found {len(search_results)} items.")
    assert mem_id in found_ids, f"Newly added memory {mem_id} was not returned by semantic search!"

    # 4. Delete memory
    s_del, del_res = http_delete(f"/agent/memories/{mem_id}")
    assert s_del == 200, f"Failed to delete memory: {del_res}"
    print(f"Deleted memory: {del_res}")

    # 5. Verify deleted memory is gone from Supabase
    s_list2, memories2 = http_get("/agent/memories?limit=50")
    assert s_list2 == 200
    assert not any(m["id"] == mem_id for m in memories2), "Memory still present in list after deletion!"
    print("Verified memory is no longer in Supabase.")

    # 6. Verify 404 on deleting non-existent memory
    s_del_404, del_res_404 = http_delete(f"/agent/memories/{mem_id}")
    assert s_del_404 == 404, f"Expected 404 for deleted memory, got {s_del_404}"
    print(f"Verified 404 handling on deleting non-existent memory: {del_res_404}")

    # 7. Search with no matches (high threshold)
    s_no_match, no_match_results = http_get("/agent/memories/search?query=totallyunrelatedsuperrandomxyz123&threshold=0.99")
    assert s_no_match == 200
    assert len(no_match_results) == 0, f"Expected 0 results for unrelated query at 0.99 threshold, got {len(no_match_results)}"
    print("Verified empty results handling for non-matching queries.")

    print("PASS: Suite 4 Memory Inspector CRUD, pgvector search, and error handling PASSED.")


# ============================================================================
# SUITE 5: CONVERSATION MANAGEMENT & CASCADE DELETION
# ============================================================================
def run_conversation_management_test():
    print("\n--- [Suite 5] Conversation Management & Cascade Deletion Testing ---")
    # 1. Create conversation
    s_create, new_conv = http_post("/conversations", {"title": "Ephemeral Cascade Test Thread"})
    assert s_create == 200
    conv_id = new_conv["id"]
    print(f"Created conversation: ID={conv_id}, Title='{new_conv['title']}'")

    # 2. Add 2 messages via chat
    http_post("/chat", {"conversation_id": conv_id, "message": "Message to be cascade-deleted."})
    http_post("/chat", {"conversation_id": conv_id, "message": "Second message to be cascade-deleted."})

    # Verify messages exist
    s_m, msgs = http_get(f"/conversations/{conv_id}/messages")
    assert s_m == 200
    assert len(msgs) >= 2, f"Expected >= 2 messages, got {len(msgs)}"
    print(f"Verified conversation contains {len(msgs)} messages.")

    # 3. Delete conversation
    s_del, del_res = http_delete(f"/conversations/{conv_id}")
    assert s_del == 200, f"Failed to delete conversation: {del_res}"
    print(f"Deleted conversation: {del_res}")

    # 4. Verify conversation is gone from listing
    s_list, convs = http_get("/conversations")
    assert s_list == 200
    assert not any(c["id"] == conv_id for c in convs), "Conversation still in list after deletion!"
    print("Verified conversation removed from conversation list.")

    # 5. Verify messages were cascade deleted from messages table
    s_m2, msgs2 = http_get(f"/conversations/{conv_id}/messages")
    assert s_m2 == 200
    assert len(msgs2) == 0, f"Messages were NOT cascade deleted! Found {len(msgs2)} messages."
    print("PASS: Verified messages table cascading deletion (0 orphaned messages).")

    # 6. Verify 404 on deleting non-existent conversation
    s_del_404, del_res_404 = http_delete(f"/conversations/{conv_id}")
    assert s_del_404 == 404, f"Expected 404 for deleted conversation, got {s_del_404}"
    print(f"Verified 404 on non-existent conversation: {del_res_404}")

    print("PASS: Suite 5 Conversation Management & Cascade Deletion PASSED.")


# ============================================================================
# SUITE 6: AUTOMATIC MEMORY EXTRACTION & DEDUPLICATION
# ============================================================================
def run_automatic_memory_extraction_test():
    print("\n--- [Suite 6] Automatic Memory Extraction & Deduplication Testing ---")
    test_conv_id = str(uuid.uuid4())

    phrases = [
        "Remember that I prefer Rust.",
        "Our project deadline is December 15.",
        "My preferred response style is concise.",
        "We decided to use Supabase for persistent memory."
    ]

    for p in phrases:
        print(f"Sending prompt: '{p}'")
        s, res = http_post("/chat", {"conversation_id": test_conv_id, "message": p})
        assert s == 200, f"Chat failed for '{p}': {res}"
        print(f"  Result -> memory_stored: {res.get('memory_stored')}, response: {res['response'][:60]}...")
        assert res.get("memory_stored") is True, f"Failed to extract and store memory for '{p}'!"

    # Test Deduplication: send identical fact again
    print("\nTesting deduplication: sending 'Remember that I prefer Rust.' a second time...")
    s_dup, res_dup = http_post("/chat", {"conversation_id": test_conv_id, "message": "Remember that I prefer Rust."})
    assert s_dup == 200

    # Check memories in Supabase to verify no redundant rows were created
    s_mem, memories = http_get("/agent/memories?limit=50")
    assert s_mem == 200
    rust_memories = [m for m in memories if "prefer Rust" in m["content"] or "prefer rust" in m["content"].lower()]
    print(f"Count of 'prefer Rust' memories in Supabase: {len(rust_memories)}")
    assert len(rust_memories) == 1, f"Deduplication failed! Found {len(rust_memories)} copies of Rust preference in database."

    print("PASS: Suite 6 Automatic Memory Extraction and Deduplication PASSED.")


# ============================================================================
# SUITE 7: SECURITY & VALIDATION TESTING
# ============================================================================
def run_security_and_validation_test():
    print("\n--- [Suite 7] Security & Input Validation Testing ---")

    # 1. Invalid UUID in memory search / conversations
    s1, r1 = http_get("/conversations/not-a-valid-uuid-12345/messages")
    print(f"Non-standard conversation ID lookup: status={s1}")
    assert s1 == 200, f"Deterministic UUID fallback failed, returned {s1}: {r1}"

    # 2. Missing payload in POST /chat
    s2, r2 = http_post("/chat", {})
    assert s2 == 422, f"Expected 422 Unprocessable Entity, got {s2}: {r2}"
    print(f"Verified 422 on empty chat request: {r2['detail'][0]['msg']}")

    # 3. Missing payload in POST /conversations
    s3, r3 = http_post("/conversations", {})
    assert s3 == 422, f"Expected 422 on empty conversation creation, got {s3}"
    print("Verified 422 on empty conversation creation.")

    # 4. Check that .env is gitignored and not tracked
    with open(".gitignore", "r") as f:
        gitignore = f.read()
    assert ".env" in gitignore, ".env is not in .gitignore!"
    print("Verified .env is present in .gitignore.")

    print("PASS: Suite 7 Security & Input Validation PASSED.")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"

    if mode == "phase1":
        run_persistence_phase1()
    elif mode == "phase2":
        run_persistence_phase2()
    elif mode == "all_suites":
        run_semantic_memory_test()
        run_agent_isolation_test()
        run_memory_inspector_test()
        run_conversation_management_test()
        run_automatic_memory_extraction_test()
        run_security_and_validation_test()
    else:
        print("Usage: python test_suite.py [phase1|phase2|all_suites]")
