-- ====================================
-- EVENTSTORM CHAT DATABASE SCHEMA
-- ====================================

-- Drop existing tables if they exist (BE CAREFUL - THIS DELETES DATA!)
-- Uncomment these lines only if you want to start fresh
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- DROP TABLE IF EXISTS conversations CASCADE;

-- ====================================
-- CREATE CONVERSATIONS TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT conversations_user_id_not_empty CHECK (user_id != ''),
    CONSTRAINT conversations_title_length CHECK (LENGTH(title) >= 1)
);

-- ====================================
-- CREATE CHAT_MESSAGES TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Add constraints
    CONSTRAINT chat_messages_user_id_not_empty CHECK (user_id != ''),
    CONSTRAINT chat_messages_content_not_empty CHECK (LENGTH(content) >= 1)
);

-- ====================================
-- CREATE INDEXES FOR PERFORMANCE
-- ====================================

-- Conversations indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
    ON conversations(user_id);
    
CREATE INDEX IF NOT EXISTS idx_conversations_user_created 
    ON conversations(user_id, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
    ON conversations(updated_at DESC);

-- Chat messages indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
    ON chat_messages(conversation_id);
    
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_conversation 
    ON chat_messages(user_id, conversation_id);
    
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
    ON chat_messages(created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_chat_messages_role 
    ON chat_messages(role);

-- Composite index for fetching conversation messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created 
    ON chat_messages(conversation_id, created_at ASC);

-- ====================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ====================================
-- CREATE TRIGGERS
-- ====================================
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- INSERT SAMPLE DATA FOR TESTING
-- ====================================
-- Sample conversation for anatolyZader
INSERT INTO conversations (id, user_id, title, created_at) 
VALUES (
    gen_random_uuid(),
    'anatolyZader',
    'Welcome Chat',
    '2025-06-11 13:42:26'
) ON CONFLICT DO NOTHING;

-- Get the conversation ID for sample messages
DO $$
DECLARE
    sample_conv_id UUID;
BEGIN
    -- Get a conversation ID for anatolyZader
    SELECT id INTO sample_conv_id 
    FROM conversations 
    WHERE user_id = 'anatolyZader' 
    LIMIT 1;
    
    -- Insert sample messages if conversation exists
    IF sample_conv_id IS NOT NULL THEN
        INSERT INTO chat_messages (conversation_id, user_id, role, content, created_at) 
        VALUES 
            (sample_conv_id, 'anatolyZader', 'user', 'Hello, this is my first message!', '2025-06-11 13:42:26'),
            (sample_conv_id, 'anatolyZader', 'ai', 'Hello anatolyZader! Welcome to the chat system. How can I help you today?', '2025-06-11 13:42:28')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ====================================
-- VERIFY SCHEMA CREATION
-- ====================================
SELECT 'CONVERSATIONS' as table_name, COUNT(*) as row_count FROM conversations;
SELECT 'CHAT_MESSAGES' as table_name, COUNT(*) as row_count FROM chat_messages;
