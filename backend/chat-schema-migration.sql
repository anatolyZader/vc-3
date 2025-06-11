-- ====================================
-- CHAT SYSTEM SCHEMA MIGRATION (FINAL)
-- ====================================

-- Check if uuid extension exists, create if not
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ====================================
-- 1. MODIFY CONVERSATIONS TABLE
-- ====================================

DO $$
BEGIN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'updated_at') THEN
        ALTER TABLE conversations ADD COLUMN updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added updated_at column to conversations table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in conversations table';
    END IF;
END $$;

-- Extend title length if needed
ALTER TABLE conversations ALTER COLUMN title TYPE VARCHAR(500);

-- Make title default to 'New Chat' if NULL
UPDATE conversations SET title = 'New Chat' WHERE title IS NULL OR title = '';
ALTER TABLE conversations ALTER COLUMN title SET DEFAULT 'New Chat';

-- Set updated_at for existing records if they don't have it
UPDATE conversations SET updated_at = created_at WHERE updated_at IS NULL;

-- ====================================
-- 2. ADD MISSING INDEXES
-- ====================================

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at 
    ON conversations(updated_at DESC);

-- ====================================
-- 3. CREATE VIEW FOR USER COMPATIBILITY
-- ====================================

CREATE OR REPLACE VIEW chat_conversations AS
SELECT 
    c.id,
    u.username as user_id,  -- Use username as the string identifier
    c.title,
    c.created_at,
    c.updated_at
FROM conversations c
LEFT JOIN users u ON c.user_id = u.id;

-- ====================================
-- 4. CREATE UPDATE TRIGGER
-- ====================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- 5. INSERT SAMPLE DATA FOR TESTING
-- ====================================

DO $$
DECLARE
    anatoly_user_id UUID;
    sample_conv_id UUID;
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Check if anatolyZader exists in users table
    SELECT id, TRUE INTO anatoly_user_id, user_exists
    FROM users 
    WHERE username = 'anatolyZader'
    LIMIT 1;
    
    -- If user doesn't exist, create one
    IF NOT user_exists THEN
        INSERT INTO users (id, username, email, password) 
        VALUES (
            uuid_generate_v4(), 
            'anatolyZader', 
            'anatoly@eventstorm.com',
            'temp_password_123'  -- You should change this
        )
        ON CONFLICT (username) DO NOTHING
        RETURNING id INTO anatoly_user_id;
        
        -- If insert was skipped due to conflict, get the existing ID
        IF anatoly_user_id IS NULL THEN
            SELECT id INTO anatoly_user_id FROM users WHERE username = 'anatolyZader' LIMIT 1;
        END IF;
        
        RAISE NOTICE 'Created/found user anatolyZader with ID: %', anatoly_user_id;
    ELSE
        RAISE NOTICE 'Found existing user anatolyZader with ID: %', anatoly_user_id;
    END IF;
    
    -- Create sample conversation
    INSERT INTO conversations (id, user_id, title, created_at, updated_at) 
    VALUES (
        uuid_generate_v4(),
        anatoly_user_id,
        'Welcome to EventStorm Chat',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ) 
    ON CONFLICT DO NOTHING
    RETURNING id INTO sample_conv_id;
    
    -- Get conversation ID if insert was skipped
    IF sample_conv_id IS NULL THEN
        SELECT id INTO sample_conv_id 
        FROM conversations 
        WHERE user_id = anatoly_user_id 
        ORDER BY created_at DESC 
        LIMIT 1;
    END IF;
    
    -- Insert sample messages
    IF sample_conv_id IS NOT NULL THEN
        INSERT INTO chat_messages (conversation_id, user_id, role, content, created_at) 
        VALUES 
            (sample_conv_id, 'anatolyZader', 'user', 'Hello! This is my first message in the EventStorm chat system.', CURRENT_TIMESTAMP),
            (sample_conv_id, 'anatolyZader', 'ai', 'Hello anatolyZader! Welcome to EventStorm Chat. I am your AI assistant ready to help you with your event storming sessions. How can I assist you today?', CURRENT_TIMESTAMP + INTERVAL '2 seconds')
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Created sample conversation with ID: %', sample_conv_id;
    END IF;
END $$;

COMMIT;

-- ====================================
-- 6. VERIFY MIGRATION RESULTS
-- ====================================

SELECT '=== MIGRATION COMPLETE ===' as status;

-- Show table counts
SELECT 'CONVERSATIONS' as table_name, COUNT(*) as row_count FROM conversations;
SELECT 'CHAT_MESSAGES' as table_name, COUNT(*) as row_count FROM chat_messages;
SELECT 'USERS' as table_name, COUNT(*) as row_count FROM users WHERE username = 'anatolyZader';

-- Show conversations through the view
SELECT '=== CHAT CONVERSATIONS VIEW ===' as status;
SELECT id, user_id, title, created_at FROM chat_conversations 
WHERE user_id = 'anatolyZader' 
ORDER BY created_at DESC;

-- Show sample messages
SELECT '=== SAMPLE MESSAGES ===' as status;
SELECT role, LEFT(content, 60) || '...' as content_preview, created_at 
FROM chat_messages 
WHERE user_id = 'anatolyZader' 
ORDER BY created_at ASC;

-- Show the conversations table structure
SELECT '=== CONVERSATIONS TABLE INFO ===' as status;
\d conversations