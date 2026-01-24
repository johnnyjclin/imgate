#!/usr/bin/env node

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
        readAssetTool,
        parseC2PATool,
        verifyPurchaseTool,
        generatePaymentLinkTool
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
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
