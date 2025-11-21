#!/bin/bash
# Pinecone REST API Helper Script

# Load environment variables
source .env 2>/dev/null || echo "Warning: No .env file found"

# Check if API key is set
if [ -z "$PINECONE_API_KEY" ]; then
    echo "Error: PINECONE_API_KEY not set"
    exit 1
fi

HOST="eventstorm-index-xi8qwb6.svc.gcp-us-central1-4a9f.pinecone.io"

case "$1" in
    "list-indexes")
        echo "📊 Listing Pinecone indexes..."
        curl -X GET "https://api.pinecone.io/indexes" \
             -H "Api-Key: $PINECONE_API_KEY" \
             -H "Content-Type: application/json" | jq '.'
        ;;
    
    "index-stats")
        echo "📈 Getting index statistics..."
        curl -X POST "https://$HOST/describe_index_stats" \
             -H "Api-Key: $PINECONE_API_KEY" \
             -H "Content-Type: application/json" \
             -d '{}' | jq '.'
        ;;
    
    "query")
        NAMESPACE=${2:-"anatolyzader_vc-3_main"}
        echo "🔍 Querying namespace: $NAMESPACE"
        curl -X POST "https://$HOST/query" \
             -H "Api-Key: $PINECONE_API_KEY" \
             -H "Content-Type: application/json" \
             -d "{
                 \"namespace\": \"$NAMESPACE\",
                 \"topK\": 5,
                 \"includeMetadata\": true,
                 \"includeValues\": false,
                 \"vector\": $(python3 -c "print([0.1] * 3072)")
             }" | jq '.'
        ;;
    
    *)
        echo "Pinecone curl helper"
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  list-indexes    List all indexes"
        echo "  index-stats     Get index statistics" 
        echo "  query [namespace] Query vectors"
        echo ""
        echo "Examples:"
        echo "  $0 list-indexes"
        echo "  $0 index-stats"
        echo "  $0 query anatolyzader_vc-3_main"
        ;;
esac