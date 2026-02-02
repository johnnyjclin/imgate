#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file relative to this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env'); // Assumes dist/index.js -> .env in root
dotenv.config({ path: envPath });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config.js';
import { readAsset, readAssetTool, ReadAssetSchema } from './tools/read-asset.js';
import { parseC2PA, parseC2PATool, ParseC2PASchema } from './tools/parse-c2pa.js';
import { verifyPurchase, verifyPurchaseTool, VerifyPurchaseSchema } from './tools/verify-purchase.js';
import { generatePaymentLink, generatePaymentLinkTool, GeneratePaymentLinkSchema } from './tools/generate-payment-link.js';
import { searchAssets, searchAssetsTool, SearchAssetsSchema } from './tools/search-assets.js';
import { agentPay, agentPayTool, AgentPaySchema } from './tools/agent-pay.js';
import { downloadAsset, downloadAssetTool, DownloadAssetSchema } from './tools/download-asset.js';

/**
 * Imgate MCP Server
 * 
 * Enables AI assistants to interact with Imgate's image licensing platform.
 * Provides tools for reading asset metadata, parsing C2PA manifests,
 * verifying purchases, and generating payment links.
 */
class ImgateMCPServer {
  private server: Server;
  private config: ReturnType<typeof loadConfig>;

  constructor() {
    this.config = loadConfig();
    
    // Debug log to stderr (visible in MCP logs)
    console.error('[Imgate] Config Status:', {
      hasApiKey: !!this.config.cdpApiKeyName,
      hasPrivateKey: !!this.config.cdpApiKeyPrivateKey,
      contract: this.config.contractAddress
    });

    this.server = new Server(
      {
        name: 'imgate-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        searchAssetsTool, // Renamed to "search" in definition, primary entry point
        agentPayTool,     // Primary action
        
        // Secondary/Utility tools (kept for backward compat or specific needs)
        readAssetTool,    
        parseC2PATool,
        verifyPurchaseTool,
        generatePaymentLinkTool,
        // searchAssetsTool, // Replaced by the consolidated search above (using same import)
        downloadAssetTool,
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search': {
             const validatedArgs = SearchAssetsSchema.parse(args);
             const result = await searchAssets(validatedArgs, this.config);
             return {
               content: [{ type: 'text', text: result }],
             };
          }

          // Legacy mapping
          case 'search_assets': {
            const validatedArgs = SearchAssetsSchema.parse(args);
            const result = await searchAssets(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'agent_pay': {
            const validatedArgs = AgentPaySchema.parse(args);
            const result = await agentPay(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'search_assets': {
            const validatedArgs = SearchAssetsSchema.parse(args);
            const result = await searchAssets(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'download_asset': {
            const validatedArgs = DownloadAssetSchema.parse(args);
            const result = await downloadAsset(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'read_asset': {
            const validatedArgs = ReadAssetSchema.parse(args);
            const result = await readAsset(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'parse_c2pa_manifest': {
            const validatedArgs = ParseC2PASchema.parse(args);
            const result = await parseC2PA(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'verify_purchase': {
            const validatedArgs = VerifyPurchaseSchema.parse(args);
            const result = await verifyPurchase(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          case 'generate_payment_link': {
            const validatedArgs = GeneratePaymentLinkSchema.parse(args);
            const result = await generatePaymentLink(validatedArgs, this.config);
            return {
              content: [{ type: 'text', text: result }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log to stderr so it doesn't interfere with MCP protocol on stdout
    console.error('🚀 Imgate MCP Server running');
    console.error('📍 API URL:', this.config.apiUrl);
    console.error('🔗 App URL:', this.config.appUrl);
    console.error('⚡ Chain:', this.config.chainId);
  }
}

// Start the server
const server = new ImgateMCPServer();
server.run().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
