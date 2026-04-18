# Antigravity Application Connections Analysis

This document outlines the connections made through the Antigravity application, including MCP servers and API identifications.

## MCP Servers

The following MCP servers are configured in `~/.gemini/antigravity/mcp_config.json`:

1.  **stitch**
    *   **Command:** `npx -y @_davideast/stitch-mcp proxy`
    *   **Project ID:** `room-to-3d-app`
    *   **Config Path:** `/Users/nautis/.stitch-mcp/config`

2.  **xcode**
    *   **Command:** `/Applications/Xcode-beta.app/Contents/Developer/usr/bin/mcpbridge`
    *   **Type:** Local executable

3.  **three-js**
    *   **Command:** `node /Users/nautis/mcp-servers/three-js-mcp/index.js`
    *   **Type:** Local Node.js server
    *   **Source:** `/Users/nautis/mcp-servers/three-js-mcp/`

4.  **bio-mcp**
    *   **Command:** `node /Users/nautis/mcp-servers/bio-mcp/build/index.js`
    *   **Type:** Local Node.js server
    *   **Source:** `/Users/nautis/mcp-servers/bio-mcp/`

## API Connections

*   **Stitch MCP**: Integrates with the `room-to-3d-app` project via `STITCH_PROJECT_ID`.
*   **Deep Research Project** (`~/Documents/Deep Research/`):
    *   **Target API**: Gemini Interactions API (Deep Research Agent).
    *   **Status**: **✓ Real Implementation**. The `main.py` script now uses the `google-genai` library to make actual API calls to the Deep Research agent.
    *   **Configuration**:
        *   `GEMINI_API_KEY`: User's Gemini API key from Google AI Studio
        *   `AGENT_ID`: `deep-research-pro-preview-12-2025`
    *   **Documentation**: Folder contains PDF guides for the Interactions API.
*   **Playground Projects**:
    *   `quantum-magnetosphere`: Scanned, found empty.
    *   `solitary-perseverance`: Scanned, found empty.

## Directories Analyzed

*   **Config:** `~/.gemini/antigravity/mcp_config.json`
*   **Playground:** `~/.gemini/antigravity/playground/`
*   **Documents:** `~/Documents/Deep Research/`
