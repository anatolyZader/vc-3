# VibeSwitch - Quick Reference Card

## 🎯 One-Minute Guide

### Test Right Now
```bash
cd /home/eventstorm1/vc-3/vibeswitch-extension
code .
# Press F5
```

### What You'll See
Bottom-right status bar:
- `⚡ VIBE` = Autonomous AI
- `📚 DEV` = Collaborative AI
- `⚙️ Mode?` = Not set

### How to Switch
1. **Click** status bar icon
2. **Select** mode from dropdown
3. **Done!**

Or press: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Linux)

---

## 📦 Extension Structure

```
vibeswitch-extension/
├── extension.js          ← Main code (280 lines)
├── package.json          ← Extension config
└── images/
    └── icon.svg          ← Extension icon
```

---

## ⚙️ Key Code Sections

### Status Bar Creation
```javascript
statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 
    100
);
statusBarItem.command = 'vibeswitch.switchMode';
```

### Mode Switching
```javascript
function switchToMode(mode) {
    // Copy .cursorrules.{mode} → .cursorrules
    fs.copyFileSync(sourceRules, cursorrules);
    
    // Copy settings.{mode}.json → settings.json
    fs.copyFileSync(sourceSettings, settingsFile);
    
    // Update status bar
    updateStatusBar();
}
```

---

## 🎨 Icon Customization

Current icon: Gear shift lever with V/D positions

To customize:
1. Edit `images/icon.svg`
2. Or replace with `icon.png` (128×128)
3. Update `package.json` → `"icon": "images/icon.png"`

---

## 📝 Commands Available

| Command | Keyboard | Action |
|---------|----------|--------|
| `vibeswitch.switchMode` | `Cmd/Ctrl+Shift+M` | Open picker |
| `vibeswitch.toVibe` | - | Direct to VIBE |
| `vibeswitch.toDev` | - | Direct to DEV |

---

## ⚙️ Settings

```json
{
  "vibeswitch.showInStatusBar": true,
  "vibeswitch.autoReload": false,
  "vibeswitch.rulesPath": ""
}
```

---

## 🚀 Installation Methods

### Method 1: F5 Debug (Testing)
1. Open `vibeswitch-extension` in VSCode
2. Press **F5**
3. Test in Extension Development Host

### Method 2: Install VSIX (Daily Use)
```bash
cd vibeswitch-extension
vsce package
code --install-extension vibeswitch-1.0.0.vsix
```

### Method 3: Publish (Share)
```bash
vsce publish
```

---

## 🔍 Troubleshooting

| Problem | Solution |
|---------|----------|
| No status bar | Check workspace folder open |
| Mode not switching | Check console for errors |
| Files not found | Click mode → Create defaults |
| Commands missing | Reload Extension Host (`Cmd/Ctrl+R`) |

---

## 📊 What Gets Switched

```
VIBE Mode:
├── .cursorrules          ← Autonomous instructions
└── settings.json         ← agent.requireApproval: false

DEV Mode:
├── .cursorrules          ← Collaborative instructions
└── settings.json         ← agent.requireApproval: true
```

---

## 🎯 Quick Actions

### Test Extension
```bash
cd vibeswitch-extension && code . # Then press F5
```

### Package Extension
```bash
npm install -g @vscode/vsce
vsce package
```

### Install Extension
```bash
code --install-extension vibeswitch-1.0.0.vsix
```

### Check Extension Logs
- View → Output → "Extension Host"
- Look for "VibeSwitch" messages

---

## 🔗 Quick Links

| Document | Purpose |
|----------|---------|
| `README.md` | User guide |
| `QUICK-TEST.md` | 5-min test |
| `INSTALLATION.md` | Install guide |
| `DEVELOPMENT.md` | Dev reference |
| `VISUAL-OVERVIEW.md` | UI/UX docs |

---

## 💡 Pro Tips

1. **Keyboard workflow**: `Cmd+Shift+M` → Arrow keys → Enter
2. **Command palette**: `Cmd+Shift+P` → "vibe" → Select command
3. **Auto-reload**: Enable `vibeswitch.autoReload` in settings
4. **Team sharing**: Send .vsix file to teammates
5. **Custom modes**: Copy extension.js, add new mode option

---

## 🎓 What You Built

✅ Full VSCode/Cursor extension
✅ Status bar integration
✅ Quick pick UI
✅ Keyboard shortcuts
✅ Command palette integration
✅ Configuration settings
✅ File watching
✅ Auto-detection
✅ Default file creation
✅ Comprehensive docs

**Total:** ~500 lines of code, production-ready! 🎉

---

## 📞 Need Help?

1. Check `QUICK-TEST.md` for testing
2. Check `DEVELOPMENT.md` for code reference
3. Check `VISUAL-OVERVIEW.md` for UI details
4. Check console: Help → Toggle Developer Tools

---

**Ready to use? Press F5 and start switching modes!** ⚡📚

