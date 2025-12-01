# Cursor Agent Mode Switching System

A comprehensive system to switch between two operational modes for the Cursor AI agent: **VIBE MODE** (autonomous) and **DEV MODE** (collaborative).

## Quick Start

```bash
# Switch to autonomous mode
./switch-mode.sh vibe

# Switch to collaborative mode
./switch-mode.sh dev

# Check current mode
./switch-mode.sh status
```

Or using Node.js:
```bash
node switch-mode.js vibe
node switch-mode.js dev
node switch-mode.js status
```

## What Gets Changed

The mode switcher modifies **two critical files** to completely transform the agent's behavior:

### 1. `.cursorrules` - AI Instructions
Contains detailed instructions that tell the Cursor AI agent how to behave, make decisions, and interact with you.

### 2. `.vscode/settings.json` - IDE & Agent Configuration
Configures both VSCode/Cursor IDE settings and Cursor-specific agent settings.

---

## VIBE MODE (Autonomous) 🚀

**Philosophy**: "Get out of my way, let me work"

### Cursor Agent Settings

| Setting | Value | Effect |
|---------|-------|--------|
| `cursor.chat.defaultMode` | `agent` | Always use Agent mode by default |
| `cursor.agent.autonomyLevel` | `high` | Maximum autonomous decision-making |
| `cursor.agent.requireApproval` | `false` | Apply changes without asking |
| `cursor.agent.autoApplyEdits` | `true` | Automatically apply code edits |
| `cursor.agent.maxTurns` | `50` | Allow long conversation chains |
| `cursor.agent.allowLongRunning` | `true` | Don't timeout on complex tasks |
| `cursor.ai.autoApply` | `true` | Auto-apply AI suggestions |
| `cursor.ai.temperature` | `0.7` | More creative/flexible responses |
| `cursor.ai.maxTokens` | `8000` | Larger responses for complex tasks |
| `cursor.ai.aggressiveCompletion` | `true` | Proactive code completion |
| `cursor.ai.multiLineCompletion` | `true` | Complete multiple lines at once |
| `cursor.ai.showSuggestions` | `always` | Always show inline suggestions |
| `cursor.codebase.indexing` | `full` | Index entire codebase for context |
| `cursor.context.maxFiles` | `100` | Use maximum context |
| `cursor.context.autoInclude` | `true` | Automatically include relevant files |
| `cursor.chat.showThinkingProcess` | `false` | Skip showing reasoning (faster) |
| `cursor.chat.minimalMode` | `true` | Less verbose UI |
| `cursor.terminal.confirmExecution` | `false` | Run commands without asking |

### VSCode/IDE Settings

| Category | Settings | Effect |
|----------|----------|--------|
| **Auto-save** | `afterDelay: 1000ms` | Save changes every second |
| **Formatting** | `formatOnSave: true` | Auto-format on every save |
| **Confirmations** | All disabled | No "Are you sure?" prompts |
| **Git** | `confirmSync: false` | Push/pull without asking |
| **Terminal** | `confirmOnExit: never` | Close terminals instantly |
| **Notifications** | `sticky: false` | Auto-dismiss notifications |
| **Suggestions** | `acceptOnEnter: on` | Quick acceptance |
| **Linting** | `alwaysShowStatus: false` | Don't show lint status |

### Agent Behavior

- Makes architecture decisions independently
- Implements features end-to-end without approval
- Fixes bugs discovered along the way
- Writes tests automatically
- Refactors code proactively
- Only asks approval for breaking changes

---

## DEV MODE (Collaborative) 🤝

**Philosophy**: "Guide me, teach me, involve me"

### Cursor Agent Settings

| Setting | Value | Effect |
|---------|-------|--------|
| `cursor.chat.defaultMode` | `ask` | Use Ask mode (read-only exploration) |
| `cursor.agent.autonomyLevel` | `low` | Controlled decision-making |
| `cursor.agent.requireApproval` | `true` | Ask before making changes |
| `cursor.agent.autoApplyEdits` | `false` | Show edits for review |
| `cursor.agent.maxTurns` | `10` | Shorter conversation chains |
| `cursor.agent.allowLongRunning` | `false` | Timeout on very long tasks |
| `cursor.ai.autoApply` | `false` | Manual approval for suggestions |
| `cursor.ai.temperature` | `0.3` | More precise/conservative responses |
| `cursor.ai.maxTokens` | `4000` | Standard response size |
| `cursor.ai.aggressiveCompletion` | `false` | Wait for explicit requests |
| `cursor.ai.multiLineCompletion` | `false` | Single line suggestions |
| `cursor.ai.showSuggestions` | `onRequest` | Show only when requested |
| `cursor.codebase.indexing` | `smart` | Selective indexing |
| `cursor.context.maxFiles` | `30` | Moderate context |
| `cursor.context.autoInclude` | `false` | Manual file inclusion |
| `cursor.chat.showThinkingProcess` | `true` | Show reasoning (educational) |
| `cursor.chat.minimalMode` | `false` | Full detailed UI |
| `cursor.terminal.confirmExecution` | `true` | Confirm before running commands |

### VSCode/IDE Settings

| Category | Settings | Effect |
|----------|----------|--------|
| **Auto-save** | `afterDelay: 3000ms` | Save every 3 seconds (slower) |
| **Formatting** | `formatOnSave: true`, `formatOnPaste: false` | Format only on save |
| **Confirmations** | All enabled | Confirm before actions |
| **Git** | `confirmSync: true` | Confirm push/pull operations |
| **Terminal** | `confirmOnExit: hasChildProcesses` | Confirm if processes running |
| **Notifications** | `sticky: true` | Notifications stay visible |
| **Suggestions** | `acceptOnEnter: smart` | More deliberate acceptance |
| **Linting** | `alwaysShowStatus: true` | Always show lint status |

### Agent Behavior

- Explains decisions and trade-offs
- Shows what will change before changing
- Asks for preferences on approaches
- Provides educational context
- Points out learning opportunities
- Waits for approval at each step

---

## Key Cursor Agent Settings Explained

### `cursor.chat.defaultMode`
- **agent**: Full autonomous agent with file editing
- **ask**: Read-only mode for exploration and questions

### `cursor.agent.autonomyLevel`
Cursor's internal setting for how independently the agent operates:
- **high**: Make bold decisions, take initiative
- **low**: Conservative, ask frequently

### `cursor.agent.requireApproval`
Whether to ask for approval before applying code changes:
- **false**: Apply changes automatically
- **true**: Show changes and wait for approval

### `cursor.ai.temperature`
Controls randomness/creativity in responses:
- **0.7**: More creative, diverse solutions
- **0.3**: More focused, deterministic

### `cursor.ai.maxTokens`
Maximum length of AI responses:
- **8000**: Longer, more comprehensive responses
- **4000**: Concise, focused responses

### `cursor.codebase.indexing`
How much of the codebase to index for context:
- **full**: Index everything for maximum context
- **smart**: Selective indexing based on usage

### `cursor.context.maxFiles`
Maximum number of files to include in context:
- **100**: Maximum context awareness
- **30**: Focused on relevant files only

---

## When to Use Each Mode

### Use VIBE MODE when:
- Working on well-defined features
- Doing refactoring or cleanup
- Building prototypes quickly
- In "flow state" and don't want interruptions
- Time-sensitive work
- Trust the AI to make good decisions

### Use DEV MODE when:
- Learning a new codebase
- Working on critical/sensitive code
- Want to understand the reasoning
- Training/pair programming
- Need to review every change
- Exploring architectural options

---

## File Structure

```
project-root/
├── .cursorrules              ← Active instructions (copied from below)
├── .cursorrules.vibe         ← VIBE mode instructions
├── .cursorrules.dev          ← DEV mode instructions
├── .vscode/
│   ├── settings.json         ← Active settings (copied from below)
│   ├── settings.vibe.json    ← VIBE mode settings
│   └── settings.dev.json     ← DEV mode settings
├── switch-mode.sh            ← Bash switcher
├── switch-mode.js            ← Node.js switcher
└── MODE-SWITCHING-README.md  ← This file
```

---

## Advanced Usage

### Make Scripts Executable
```bash
chmod +x switch-mode.sh switch-mode.js
```

### Create Aliases
Add to your `.bashrc` or `.zshrc`:
```bash
alias vibe='cd /home/eventstorm1/vc-3 && ./switch-mode.sh vibe'
alias devmode='cd /home/eventstorm1/vc-3 && ./switch-mode.sh dev'
alias mode='cd /home/eventstorm1/vc-3 && ./switch-mode.sh status'
```

### Add to npm scripts
In `package.json`:
```json
{
  "scripts": {
    "mode:vibe": "node switch-mode.js vibe",
    "mode:dev": "node switch-mode.js dev",
    "mode:status": "node switch-mode.js status"
  }
}
```

---

## Customization

### Modify Agent Behavior
Edit `.cursorrules.vibe` or `.cursorrules.dev` to adjust the AI's instructions and personality.

### Modify Settings
Edit `.vscode/settings.vibe.json` or `.vscode/settings.dev.json` to adjust IDE and agent configuration.

### Add More Modes
1. Create `.cursorrules.yourmode`
2. Create `.vscode/settings.yourmode.json`
3. Add a case to the switch scripts

---

## Troubleshooting

### Changes not taking effect?
- Reload Cursor window: `Cmd/Ctrl + Shift + P` → "Reload Window"
- Check that files were copied: `./switch-mode.sh status`

### Settings keep reverting?
- Check for workspace settings overriding
- Ensure `.vscode/settings.json` is not gitignored and being overwritten

### Agent not following instructions?
- Verify `.cursorrules` file exists and has content
- Try starting a new chat session
- Reload the Cursor window

---

## Notes

- **Settings take effect immediately** but may require a window reload
- **Git ignoring**: Consider adding `.vscode/settings.json` to `.gitignore` if settings are personal
- **Team usage**: Commit `.cursorrules.*` and `.vscode/settings.*.json` for team-wide modes
- **Cursor updates**: Some settings may change with Cursor updates

---

## Contributing

To add new features to the mode switching system:

1. Identify the setting in Cursor Settings UI
2. Add it to both `.vscode/settings.vibe.json` and `.vscode/settings.dev.json`
3. Document it in this README
4. Test by switching modes and verifying the behavior change

