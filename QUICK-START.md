# Quick Start - Cursor Mode Switching

## ⚡ TL;DR

```bash
# Autonomous AI that works independently
./switch-mode.sh vibe

# Collaborative AI that explains everything
./switch-mode.sh dev

# Check which mode you're in
./switch-mode.sh status
```

## ✅ What Just Got Created

1. **`.cursorrules.vibe`** - Instructions for autonomous AI behavior
2. **`.cursorrules.dev`** - Instructions for collaborative AI behavior
3. **`.vscode/settings.vibe.json`** - IDE + Cursor agent settings for VIBE mode
4. **`.vscode/settings.dev.json`** - IDE + Cursor agent settings for DEV mode
5. **`switch-mode.sh`** - Bash script to switch modes
6. **`switch-mode.js`** - Node.js script to switch modes
7. **Documentation** - This file + comprehensive README

## 🎯 What Changes Between Modes

### VIBE Mode = "Just Do It"
- ✅ AI applies changes automatically
- ✅ No approval needed for most actions
- ✅ Minimal interruptions
- ✅ Maximum context (100 files)
- ✅ Long-running tasks allowed
- ✅ Auto-apply suggestions
- ✅ Silent notifications

### DEV Mode = "Show Me Everything"
- 📖 AI asks before applying changes
- 📖 Explains reasoning and trade-offs
- 📖 Frequent check-ins
- 📖 Focused context (30 files)
- 📖 Shorter conversation chains
- 📖 Manual approval for suggestions
- 📖 Visible notifications

## 🚀 Next Steps

### 1. Test the Switch
```bash
./switch-mode.sh vibe
# Start a chat with Cursor - notice the autonomous behavior

./switch-mode.sh dev
# Start a new chat - notice the collaborative approach
```

### 2. Reload Cursor (if needed)
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Linux/Windows)
- Type "Reload Window"
- Press Enter

### 3. Start Using It
Open a chat with Cursor and ask it to do something:

**In VIBE Mode:**
```
You: "Refactor the auth module to use middleware"
AI: [Proceeds to refactor everything autonomously]
    "Done. Modified 5 files, added middleware, updated tests."
```

**In DEV Mode:**
```
You: "Refactor the auth module to use middleware"
AI: "I suggest moving authentication logic to middleware. 
     Here's my plan:
     1. Create middleware function
     2. Update routes
     3. Add tests
     
     Should I proceed? Would you prefer a different approach?"
```

## 📊 Key Cursor Agent Settings Being Controlled

| What It Controls | VIBE | DEV |
|------------------|------|-----|
| **Chat Mode** | Agent (full autonomy) | Ask (read-only) |
| **Auto-apply changes** | ✅ Yes | ❌ No (preview) |
| **Require approval** | ❌ No | ✅ Yes |
| **Max conversation turns** | 50 | 10 |
| **AI creativity** | High (0.7) | Focused (0.3) |
| **Context files** | 100 | 30 |
| **Show reasoning** | ❌ No | ✅ Yes |

## 💡 Pro Tips

### When to Use VIBE
- You know what you want built
- You're prototyping
- You're in flow state
- Time-sensitive work
- Refactoring/cleanup tasks

### When to Use DEV
- Learning new code
- Critical/sensitive changes
- You want to understand WHY
- Training or pair programming
- Exploring options

### Daily Pattern
```
Morning:   DEV mode  → Plan and understand
Afternoon: VIBE mode → Execute and build
Evening:   DEV mode  → Review and refine
```

## 🔧 Customization

Want to tweak behavior? Edit these files:

**Change AI instructions:**
- `.cursorrules.vibe` - Edit agent behavior
- `.cursorrules.dev` - Edit agent behavior

**Change IDE settings:**
- `.vscode/settings.vibe.json` - Edit Cursor & VSCode settings
- `.vscode/settings.dev.json` - Edit Cursor & VSCode settings

Then switch modes again to apply changes.

## 📚 More Documentation

- **`MODE-SWITCHING-README.md`** - Comprehensive guide
- **`.vscode/SETTINGS-COMPARISON.md`** - Detailed settings comparison

## ❓ Troubleshooting

**Changes not working?**
```bash
# 1. Verify mode is set
./switch-mode.sh status

# 2. Reload Cursor window
Cmd/Ctrl + Shift + P → "Reload Window"

# 3. Start a new chat session
```

**Want to reset?**
```bash
# Switch to desired mode
./switch-mode.sh dev

# Reload window
# Start fresh chat
```

## 🎓 Example Workflows

### Workflow 1: Build a Feature
```bash
# 1. Plan in DEV mode
./switch-mode.sh dev
# Chat: "I need to add user settings. What's the best approach?"

# 2. Build in VIBE mode
./switch-mode.sh vibe
# Chat: "Implement user settings with the approach we discussed"

# 3. Review in DEV mode
./switch-mode.sh dev
# Chat: "Review the user settings implementation for issues"
```

### Workflow 2: Learn Then Execute
```bash
# 1. Learn the codebase
./switch-mode.sh dev
# Chat: "Explain how authentication works in this app"

# 2. Make changes
./switch-mode.sh vibe
# Chat: "Add 2FA support to the auth system"
```

### Workflow 3: All-Day VIBE
```bash
# For experienced devs who trust the AI
./switch-mode.sh vibe

# Work all day with minimal interruptions
# Switch to dev mode only for code review
```

## 🔐 Settings That Can Be Modified

The system safely modifies:
- `.cursorrules` (AI behavior instructions)
- `.vscode/settings.json` (IDE configuration)

It does NOT modify:
- Your code
- Git configuration
- System settings
- User-level Cursor settings (`~/.config/Cursor/`)

## 🎉 You're Ready!

The mode switching system is now active and ready to use. Try both modes and see which fits your workflow better for different tasks!

**Start here:**
```bash
./switch-mode.sh vibe
```

Then open a Cursor chat and ask it to build something. Watch how it operates autonomously! 🚀

