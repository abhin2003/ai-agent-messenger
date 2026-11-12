# Supabase Database & pgvector Setup Guide

This guide walks you through executing `schema.sql` in your Supabase dashboard to provision all required tables, vector extensions, and the `match_agent_memories` RPC function.

---

## 1. Open the Supabase SQL Editor

1. Open your browser and navigate to your project dashboard:
   👉 **[https://supabase.com/dashboard/project/czhqkocgtbztfyqwukwz](https://supabase.com/dashboard/project/czhqkocgtbztfyqwukwz)**
2. In the left navigation sidebar, click on the **SQL Editor** icon (represented by the `>_` terminal symbol).
3. Click the **"+ New query"** button at the top of the editor.

---

## 2. Execute `schema.sql`

1. Open [`backend/sql/schema.sql`](./schema.sql) in your code editor.
2. Copy the entire file content.
3. Paste it directly into the Supabase SQL Editor query pane.
4. Click the green **"Run"** button in the bottom right corner (or press `Ctrl + Enter` / `Cmd + Enter`).
5. Confirm that the status message at the bottom displays:
   ```
   Success. No rows returned.
   ```

---

## 3. Verify All Four Tables Exist

In the left sidebar of your Supabase dashboard, click on **Table Editor** (the grid icon):

You should see all 4 tables created under the `public` schema:
1. `agents` (with 1 seeded row: `Research Assistant`, ID: `00000000-0000-0000-0000-000000000001`)
2. `conversations`
3. `messages`
4. `agent_memories`

Alternatively, you can run this verification query in the **SQL Editor**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('agents', 'conversations', 'messages', 'agent_memories');
```
*Expected result: 4 rows returned.*

---

## 4. Verify pgvector is Enabled

Run this quick check in the **SQL Editor**:
```sql
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';
```
*Expected result:*
| extname | extversion |
| :--- | :--- |
| `vector` | `0.8.0` (or installed version) |

---

## 5. Test the Semantic Search Function (`match_agent_memories`)

To verify the RPC function without needing the backend running yet, run this test script in the **SQL Editor**:

```sql
-- Step A: Insert a test vector memory for the default Research Assistant
INSERT INTO public.agent_memories (
    agent_id, 
    content, 
    embedding, 
    memory_type
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Technical Decision: AI Agent Messenger uses Supabase PostgreSQL with pgvector for persistent semantic memory.',
    -- Sample 768-dimensional test vector (1.0 at index 0, followed by 767 zeros)
    ('[' || array_to_string(array_prepend(1.0, array_fill(0.0::float, ARRAY[767])), ',') || ']')::vector(768),
    'semantic_memory'
);

-- Step B: Run semantic similarity search using match_agent_memories
SELECT * FROM public.match_agent_memories(
    query_embedding := ('[' || array_to_string(array_prepend(1.0, array_fill(0.0::float, ARRAY[767])), ',') || ']')::vector(768),
    filter_agent_id := '00000000-0000-0000-0000-000000000001',
    match_threshold := 0.5,
    match_count := 5
);

-- Step C: Clean up the test memory entry
DELETE FROM public.agent_memories 
WHERE content LIKE 'Technical Decision: AI Agent Messenger uses Supabase%';
```

*Expected output in Step B:*
A row is returned containing the test content with `similarity = 1.0` (100% cosine similarity match).

