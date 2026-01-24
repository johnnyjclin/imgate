# Imgate MCP Server

Model Context Protocol (MCP) server for Imgate - enables AI assistants like Claude to read paywall information from images, parse C2PA manifests, and guide users through the payment flow.

## Features

- 🖼️ **Read Asset Metadata** - Fetch image details, pricing, and creator info
- ✅ **Parse C2PA Manifests** - Extract content credentials and verify authenticity
- 💰 **Generate Payment Links** - Create payment URLs for licensing images
- 🔐 **Verify Purchases** - Check if a wallet has valid license for an image

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Imgate API URL
```

### 3. Run Server

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start
```

## Using with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "imgate": {
      "command": "node",
      "args": ["/path/to/imgate/packages/mcp-server/dist/index.js"],
      "env": {
        "IMGATE_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "imgate": {
      "command": "pnpm",
      "args": ["--dir", "/path/to/imgate/packages/mcp-server", "dev"]
    }
  }
}
```

## Available Tools

### `read_asset`
Fetch comprehensive asset metadata by slug or asset ID.

```typescript
{
  "slug": "abcd12"  // or "assetId": "uuid-here"
}
```

### `parse_c2pa_manifest`
Extract and display C2PA content credentials from an image.

```typescript
{
  "assetId": "uuid-here"
}
```

### `verify_purchase`
Check if a wallet address has an active license for an image.

```typescript
{
  "assetId": "uuid-here",
  "walletAddress": "0x..."
}
```

### `generate_payment_link`
Create a payment URL for purchasing image license.

```typescript
{
  "assetId": "uuid-here"
}
```

## Architecture

```
AI Assistant (Claude)
       ↓
   MCP Client (built into Claude Desktop)
       ↓
   MCP Server (this package) - STDIO transport
       ↓
   Imgate Next.js API (/api/asset/*, etc.)
       ↓
   MongoDB + Blockchain + IPFS
```

## Development

```bash
# Type checking
pnpm type-check

# Watch mode
pnpm dev
```

## Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Demo Scenario

**User**: "What's the licensing info for this image?" *[attaches pic.xyz/abcd12]*

**Claude** (via MCP): 
> ✅ C2PA Manifest Verified  
> 📸 Creator: 0xABC...  
> 💰 License Required: 5 USDC  
> 🔗 [Pay here](https://pic.xyz/abcd12)

**User**: "I just paid, can I download now?"

**Claude** (via MCP):
> ✅ License verified! Your purchase is valid for 24 hours.  
> 📥 [Download high-resolution original](https://pic.xyz/abcd12/download)
