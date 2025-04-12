#!/usr/bin/env node
/**
 * Front App MCP - Integration with Front API
 *
 * This module provides tools to interact with Front's API through Model Context Protocol.
 * It allows retrieving messages from Front inboxes with various filtering options.
 *
 * @packageDocumentation
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { FrontClient } from './front-client.js';
/**
 * MCP Server instance for Front integration
 */
export const server = new McpServer({
    name: 'FrontMcp',
    version: '0.9.0',
});
/**
 * Tool to retrieve messages from a Front inbox
 *
 * @remarks
 * This tool fetches messages from a specified Front inbox with various filtering options
 * such as limit, query string, resolution status, and conversation status.
 */
server.tool('getConversations', 'Get conversations from a Front inbox', {
    inboxId: z
        .string()
        .optional()
        .describe('Front Inbox ID (uses DEFAULT_INBOX_ID env var if not provided)'),
    limit: z
        .number()
        .min(1)
        .max(100)
        .default(10)
        .describe('Number of messages to get (max 100)'),
    query: z.string().optional().describe('Optional search query'),
    onlyUnresolved: z
        .boolean()
        .default(false)
        .describe('Only retrieve unresolved/open conversations'),
    status: z
        .enum(['open', 'archived', 'deleted', 'spam'])
        .optional()
        .describe('Filter conversations by status'),
}, async ({ inboxId, limit, query, onlyUnresolved, status }) => {
    // Get API token from environment variables
    const token = process.env.FRONT_API_TOKEN;
    if (!token) {
        throw new Error('FRONT_API_TOKEN environment variable is required');
    }
    // Get inboxId from params or from environment variable
    const resolvedInboxId = inboxId || process.env.DEFAULT_INBOX_ID;
    if (!resolvedInboxId) {
        throw new Error('inboxId parameter or DEFAULT_INBOX_ID environment variable is required');
    }
    // Create FrontClient instance
    const client = new FrontClient({ token });
    try {
        // Set up parameters for fetching inbox messages
        const params = { limit };
        if (query) {
            params.q = query;
        }
        if (onlyUnresolved) {
            params.onlyUnresolved = true;
        }
        else if (status) {
            params.status = status;
        }
        const result = await client.listInboxMessages(resolvedInboxId, params);
        // Transform API response to match MCP format with content property
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        conversations: result.conversations.length,
                        messages: result.messages.map(msg => ({
                            id: msg.id,
                            type: msg.type,
                            isInbound: msg.is_inbound,
                            createdAt: new Date(msg.created_at * 1000).toISOString(),
                            text: msg.text,
                            blurb: msg.blurb,
                        })),
                    }),
                },
            ],
        };
    }
    catch (error) {
        throw new Error(`Front API error: ${error instanceof Error ? error.message : String(error)}`);
    }
});
/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch(error => {
    console.error('Server error:', error);
    process.exit(1);
});
