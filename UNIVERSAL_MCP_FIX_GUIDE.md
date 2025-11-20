
# Universal MCP Tools Fix Guide

## Problem
MCP Playwright tools fail because:
1. Automatic browser installation fails on some Linux distributions
2. System-specific browser paths vary
3. Environment configuration differs

## Universal Solution

### 1. Use Configuration Files (Not System Modifications)
Instead of modifying system files, use project-specific configuration:

```json
// universal_playwright_config.json
{
  "browser_options": {
    "chromium": {
      "executable_path": "/usr/bin/chromium",
      "fallback_paths": [...]
    }
  }
}
```

### 2. Environment Variable Override
Set environment variables in the MCP server startup:

```bash
PLAYWRIGHT_BROWSERS_PATH=0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 node src/index.ts
```

### 3. Browser Detection
The configuration includes automatic browser detection for:
- Linux (multiple distributions)
- macOS
- Windows

### 4. Fallback Strategy
If the primary browser path fails, try fallback paths automatically.

## Implementation

1. **No system modifications** - everything is project-local
2. **Cross-platform compatibility** - works on all operating systems
3. **Automatic detection** - finds available browsers
4. **Graceful fallbacks** - tries multiple browser paths

## Testing

Run the universal test:
```bash
python3.11 test_playwright.py
```

This will:
- Test Playwright import
- Test browser launch
- Create universal configuration
- Generate this guide

## Benefits

- ✅ Works on all systems without customization
- ✅ No sudo or system modifications required
- ✅ Automatic browser detection
- ✅ Graceful fallback handling
- ✅ Project-local configuration only
