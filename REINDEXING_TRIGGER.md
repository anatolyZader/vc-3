# Re-indexing Trigger

**Timestamp**: 2025-10-30T12:20:00Z

This file was created to trigger repository re-indexing with the new semantic metadata preservation logic.

## Expected Changes After Re-indexing

### Before (Old Chunks):
- `"rechunked": true` - chunks were re-chunked at 1400 token threshold
- Missing `semantic_role`, `unit_name`, `eventstorm_module` metadata
- Incomplete file coverage (only 2/3 methods visible for large files)

### After (New Chunks):
- No `"rechunked": true` flag (or `"rechunked": false`)
- Preserved `semantic_role`, `unit_name`, `eventstorm_module` from AST splitter
- Complete file coverage - up to 100 chunks for explicit filename queries
- Better semantic coherence - functions/classes not split mid-code

## Commit Reference
- Previous commit: `ad90c67` - feat: preserve semantic metadata and ensure complete file retrieval
- Changes: Removed rechunking (107 lines), enhanced FTS limit to 100

## Verification Steps
1. Query: "list all methods in aiService.js"
2. Check metadata for: `semantic_role`, `unit_name`, `eventstorm_module`
3. Verify all 3 methods visible: `respondToPrompt`, `processPushedRepo`, `generateResponse`
4. Confirm no `"rechunked": true` in metadata
