# Cursor Agent Settings - Mode Comparison

Quick reference showing what changes between VIBE and DEV modes.

## 🔥 Critical Cursor Agent Settings

| Setting | VIBE Mode | DEV Mode | Impact |
|---------|-----------|----------|--------|
| **Default Mode** | `agent` | `ask` | 🔴 HUGE - Agent vs Read-only |
| **Require Approval** | `false` | `true` | 🔴 HUGE - Auto-apply vs Manual |
| **Auto Apply Edits** | `true` | `false` | 🔴 HUGE - Instant changes vs Preview |
| **Autonomy Level** | `high` | `low` | 🟠 HIGH - Decision independence |
| **Max Turns** | `50` | `10` | 🟠 HIGH - Conversation length |
| **Allow Long Running** | `true` | `false` | 🟠 HIGH - Complex task support |

## 🎯 AI Behavior Settings

| Setting | VIBE Mode | DEV Mode | Why Different |
|---------|-----------|----------|---------------|
| **Temperature** | `0.7` | `0.3` | VIBE: Creative solutions<br>DEV: Precise, predictable |
| **Max Tokens** | `8000` | `4000` | VIBE: Comprehensive responses<br>DEV: Concise explanations |
| **Show Suggestions** | `always` | `onRequest` | VIBE: Proactive<br>DEV: On-demand |
| **Aggressive Completion** | `true` | `false` | VIBE: Predict ahead<br>DEV: Wait for input |
| **Multi-line Completion** | `true` | `false` | VIBE: Complete blocks<br>DEV: Line-by-line |

## 🗂️ Context & Indexing

| Setting | VIBE Mode | DEV Mode | Impact |
|---------|-----------|----------|--------|
| **Indexing** | `full` | `smart` | VIBE: All files indexed<br>DEV: Selective |
| **Max Context Files** | `100` | `30` | VIBE: Maximum awareness<br>DEV: Focused scope |
| **Auto Include** | `true` | `false` | VIBE: Pull in related files<br>DEV: Manual selection |

## 💬 Chat Experience

| Setting | VIBE Mode | DEV Mode | User Experience |
|---------|-----------|----------|-----------------|
| **Show Thinking** | `false` | `true` | VIBE: Just results<br>DEV: Show reasoning |
| **Minimal Mode** | `true` | `false` | VIBE: Clean UI<br>DEV: Full details |
| **Auto Focus** | `false` | `true` | VIBE: Stay in editor<br>DEV: Jump to chat |

## ⚙️ VSCode Settings Impact

### File Operations
| Action | VIBE | DEV |
|--------|------|-----|
| Delete file | ✓ Instant | ❓ Confirm |
| Move files | ✓ Instant | ❓ Confirm |
| Auto-save delay | 1 sec | 3 sec |

### Git Operations
| Action | VIBE | DEV |
|--------|------|-----|
| Sync | ✓ Auto | ❓ Confirm |
| Smart commit | ✓ Stage all | ❌ Manual stage |
| Push notification | ❌ Silent | ✓ Show |

### Editor Behavior
| Feature | VIBE | DEV |
|---------|------|-----|
| Suggestion acceptance | `Enter` key | `Tab` or manual |
| Notifications | Auto-dismiss | Stay visible |
| Problem indicators | Hidden in panel | Status bar + panel |
| Lightbulb hints | Hidden | Shown |

## 🎭 Real-World Scenarios

### Scenario 1: Refactor 20 files

**VIBE MODE:**
```
Agent: "I'll refactor all 20 files, update imports, and run tests"
→ [Works for 5 minutes]
Agent: "✓ Done. All tests passing."

Interruptions: 0
Developer actions: 0
Time: 5 minutes
```

**DEV MODE:**
```
Agent: "I'll refactor file 1. Here's my plan..."
Developer: "Approved"
→ [Applies changes to file 1]
Agent: "File 1 done. Move to file 2?"
Developer: "Yes"
→ [Repeat 20 times]

Interruptions: 40+
Developer actions: 40+
Time: 30 minutes
```

### Scenario 2: Add new feature

**VIBE MODE:**
```
Developer: "Add user authentication"
Agent: 
  ✓ Creates auth service
  ✓ Adds middleware
  ✓ Updates routes
  ✓ Writes tests
  ✓ Updates docs
  "Feature complete. 5 files modified, 300 lines added."
```

**DEV MODE:**
```
Developer: "Add user authentication"
Agent: "I suggest this architecture: [explains]
       Should I proceed with auth service?"
Developer: "Yes, but use JWT"
Agent: "Here's the auth service code: [shows code]"
Developer: "Looks good, apply it"
Agent: "Applied. Now for middleware? [explains approach]"
[... continues with approval at each step ...]
```

## 📊 Performance Comparison

| Metric | VIBE Mode | DEV Mode |
|--------|-----------|----------|
| **Time to complete feature** | 5-10 min | 20-30 min |
| **Developer interventions** | 1-2 | 10-20 |
| **Context switches** | Low | High |
| **Learning opportunities** | Low | High |
| **Risk of errors** | Medium | Low |
| **Good for...** | Execution | Understanding |

## 🎓 Learning Impact

### VIBE Mode Learning
- Learn by seeing results
- Faster iteration
- Pattern recognition through volume
- Trust-building with AI

### DEV Mode Learning
- Learn the "why" behind decisions
- Understand trade-offs
- Deeper comprehension
- Skill development

## 🔧 Quick Customization Tips

### Want MORE autonomy in VIBE?
```json
"cursor.agent.maxTurns": 100,
"cursor.ai.temperature": 0.8,
"cursor.context.maxFiles": 200
```

### Want MORE control in DEV?
```json
"cursor.agent.maxTurns": 5,
"cursor.ai.temperature": 0.1,
"cursor.terminal.confirmExecution": true
```

### Hybrid Mode Ideas
Create `.cursorrules.hybrid` and `.vscode/settings.hybrid.json`:
- Use agent mode but require approval
- Show thinking process but minimize prompts
- High context but manual file inclusion

## 🚨 Settings to NEVER change

These should stay the same in both modes:
```json
"cursor.privacy.allowTelemetry": true,  // Your choice
"cursor.ai.model": "claude-3.5-sonnet", // Keep consistent
"cursor.ai.streamResponse": true,        // Better UX
"cursor.ai.useCache": true              // Performance
```

## 📝 Adding Your Own Settings

1. Find the setting in Cursor:
   - `Cmd/Ctrl + ,` → Search for setting
   - Or check Cursor docs

2. Add to both files:
   - `.vscode/settings.vibe.json`
   - `.vscode/settings.dev.json`

3. Set appropriate values:
   - VIBE: Maximize autonomy, minimize interruption
   - DEV: Maximize control, maximize learning

4. Test by switching modes:
   ```bash
   ./switch-mode.sh vibe
   # Test behavior
   ./switch-mode.sh dev
   # Test behavior
   ```

## 🎯 Recommended Usage Pattern

### Week-long project:
- Monday: **DEV mode** - Understand requirements, plan architecture
- Tue-Thu: **VIBE mode** - Implement features rapidly
- Friday: **DEV mode** - Review, refine, document

### Daily pattern:
- Morning: **DEV mode** - Plan the day, understand changes
- Afternoon: **VIBE mode** - Execute implementations
- Evening: **DEV mode** - Review, commit, prepare for next day

### Feature development:
1. **DEV mode**: Design and plan (30 min)
2. **VIBE mode**: Implement (2 hours)
3. **DEV mode**: Review and refine (30 min)

