#!/bin/bash
# Secrets Management Helper for Local Development

set -e

ENV_FILE="backend/.env"
ENV_TEMPLATE="backend/.env.template"

echo "🔐 Local Development Secrets Setup"
echo "===================================="
echo ""

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  $ENV_FILE already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing $ENV_FILE"
        echo ""
        echo "To edit manually: nano $ENV_FILE"
        exit 0
    fi
fi

# Copy template
echo "📝 Creating $ENV_FILE from template..."
cp "$ENV_TEMPLATE" "$ENV_FILE"

echo "✅ Created $ENV_FILE"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit the file with your API keys:"
echo "   nano $ENV_FILE"
echo "   # or"
echo "   code $ENV_FILE"
echo ""
echo "2. Required API keys to add:"
echo "   - GITHUB_TOKEN (for repository access)"
echo "   - PINECONE_API_KEY (for vector database)"
echo "   - OPENAI_API_KEY (for embeddings & AI)"
echo ""
echo "3. Optional API keys:"
echo "   - ANTHROPIC_API_KEY (for Claude)"
echo "   - GOOGLE_API_KEY (for Google AI)"
echo "   - YOUTUBE_API_KEY (if using YouTube features)"
echo ""
echo "4. The following are already configured for local dev:"
echo "   ✅ Database connection (localhost PostgreSQL)"
echo "   ✅ Redis connection (localhost)"
echo "   ✅ JWT/Session secrets (dev values)"
echo ""
echo "5. Security reminder:"
echo "   🔒 .env is in .gitignore - safe to add real keys"
echo "   ⚠️  Never commit .env file to git!"
echo ""
echo "6. After adding keys, start the backend:"
echo "   cd backend"
echo "   npm install  # if not done yet"
echo "   npm run dev-stable:local"
echo ""
