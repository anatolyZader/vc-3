# Node.js Upgrade Guide

## Issue
SonarQube for VS Code requires Node.js version 20.12.0 or later.
Current version: 19.6.0

## Solution: Upgrade to Node.js 20 LTS

### Option 1: Direct Download (Recommended)

1. **Download Node.js 20 LTS**
   - Visit: https://nodejs.org/
   - Download: "20.x.x LTS (Recommended For Most Users)"
   - Or direct link: https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi

2. **Run the Installer**
   - Close VSCode and any terminals
   - Run the downloaded `.msi` file
   - Follow the installation wizard
   - Accept all default options
   - It will automatically update your existing installation

3. **Verify the Installation**
   ```powershell
   # Open a NEW PowerShell window (important!)
   node --version
   # Should show: v20.18.0 (or later)
   
   npm --version
   # Should show: 10.x.x (or later)
   ```

4. **Restart VSCode**
   - Close VSCode completely
   - Reopen your workspace
   - SonarQube should now work

### Option 2: Using Winget (Windows Package Manager)

```powershell
# Check if winget is available
winget --version

# Install Node.js 20 LTS
winget install OpenJS.NodeJS.LTS

# Restart your terminal and verify
node --version
```

### Option 3: Using Chocolatey (if installed)

```powershell
# Check if chocolatey is available
choco --version

# Install Node.js 20
choco upgrade nodejs-lts -y

# Restart your terminal and verify
node --version
```

### Option 4: Using NVM for Windows (Node Version Manager)

If you need to manage multiple Node.js versions:

1. **Install NVM for Windows**
   - Download: https://github.com/coreybutler/nvm-windows/releases
   - Download: `nvm-setup.exe`
   - Run installer

2. **Use NVM to install Node.js 20**
   ```powershell
   # List available versions
   nvm list available
   
   # Install Node.js 20 LTS
   nvm install 20
   
   # Use Node.js 20
   nvm use 20
   
   # Verify
   node --version
   ```

## After Upgrading

### 1. Verify Installation
```powershell
node --version    # Should be v20.x.x or later
npm --version     # Should be 10.x.x or later
where.exe node    # Should show C:\Program Files\nodejs\node.exe
```

### 2. Clear npm Cache (Optional but Recommended)
```powershell
npm cache clean --force
```

### 3. Reinstall Dependencies
```powershell
# Backend
cd c:\dev\vc-3\backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend
cd c:\dev\vc-3\client
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### 4. Restart VSCode
- Close VSCode completely
- Reopen your workspace
- SonarQube should now analyze JSON files without errors

## Why Upgrade to Node.js 20?

- **LTS (Long Term Support)**: Supported until April 2026
- **Performance**: Faster V8 engine, better performance
- **Features**: 
  - Built-in test runner
  - Improved WebStreams support
  - Better ESM support
  - Performance improvements
- **Security**: Latest security patches
- **Compatibility**: Required by modern tools like SonarQube

## Current Node.js Versions

| Version | Status | Support Until |
|---------|--------|---------------|
| Node.js 18 | LTS | April 2025 |
| Node.js 19 | EOL | June 2023 (End of Life) ⚠️ |
| Node.js 20 | LTS | April 2026 ✅ |
| Node.js 21 | Current | June 2024 |
| Node.js 22 | Current | Oct 2024 |

**Note**: You're on Node.js 19, which is already End of Life. Upgrading to Node.js 20 LTS is highly recommended!

## Troubleshooting

### Issue: "node --version" still shows old version
**Solution**: 
- Close ALL PowerShell/terminal windows
- Restart VSCode
- Open a new terminal
- The PATH should now pick up the new Node.js

### Issue: Multiple Node.js versions found
```powershell
# Check all Node.js installations
where.exe node

# Should show only one path: C:\Program Files\nodejs\node.exe
# If you see multiple paths, uninstall old versions via:
# - Control Panel → Programs → Uninstall
# - Or use: winget uninstall nodejs
```

### Issue: npm doesn't work after upgrade
```powershell
# Reinstall npm
npm install -g npm@latest

# Or download Node.js installer again and repair
```

### Issue: Permission errors
```powershell
# Run PowerShell as Administrator
# Right-click Start → Windows PowerShell (Admin)
# Then run the node installer
```

## Quick Steps (TL;DR)

1. Download: https://nodejs.org/ (20.x LTS)
2. Close VSCode
3. Install the `.msi` file
4. Open new PowerShell: `node --version` (should be 20.x)
5. Reopen VSCode
6. Done! ✅

## Additional Resources

- **Node.js Official Site**: https://nodejs.org/
- **Node.js Releases**: https://nodejs.org/en/about/previous-releases
- **NVM for Windows**: https://github.com/coreybutler/nvm-windows
- **Node.js Docs**: https://nodejs.org/docs/latest-v20.x/api/

---

**After upgrading, SonarQube for VS Code will work correctly!** 🎉
