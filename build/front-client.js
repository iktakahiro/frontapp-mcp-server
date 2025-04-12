import fetch from 'node-fetch';
/**
 * Client for interacting with the Front API.
 * Provides methods to fetch conversations, messages, and other data from Front.
 */
export class FrontClient {
    token;
    baseUrl;
    /**
     * Creates a new instance of the Front API client.
     * @param options - Configuration options for the client
     * @throws Error if token is not provided and not found in environment variable FRONT_API_TOKEN
     */
    constructor(options = {}) {
        this.token = options.token || process.env.FRONT_API_TOKEN || '';
        if (!this.token) {
            throw new Error('Front API token not provided and not found in environment variable: FRONT_API_TOKEN');
        }
        this.baseUrl = options.baseUrl || 'https://api2.frontapp.com';
    }
    /**
     * Sends a request to the Front API.
     * @param method - HTTP method to use for the request (GET, POST, PUT, PATCH, DELETE)
     * @param path - API endpoint path
     * @param data - Optional data to send with the request (for POST, PUT, PATCH methods)
     * @returns Promise that resolves with the parsed JSON response
     * @throws Error if the request fails
     * @internal
     */
    async request(method, path, data) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        const options = {
            method,
            headers,
        };
        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(`Front API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorBody)}`);
        }
        return response.json();
    }
    /**
     * Retrieves a list of conversations from a specified inbox.
     * @param inboxId - ID of the inbox
     * @param params - Query parameters for filtering conversations
     * @returns Promise that resolves with the paginated conversation results
     */
    async listInboxConversations(inboxId, params = {}) {
        const queryParams = new URLSearchParams();
        // Basic query parameters
        if (params.q)
            queryParams.append('q', params.q);
        if (params.page_token)
            queryParams.append('page_token', params.page_token);
        if (params.limit)
            queryParams.append('limit', params.limit.toString());
        if (params.start)
            queryParams.append('start', params.start);
        if (params.end)
            queryParams.append('end', params.end);
        // Filter by status
        if (params.status) {
            const statusQuery = `status:"${params.status}"`;
            if (params.q) {
                // Concatenate with AND if there's an existing query
                queryParams.set('q', `${params.q} AND ${statusQuery}`);
            }
            else {
                queryParams.append('q', statusQuery);
            }
        }
        const queryString = queryParams.toString();
        const path = `/inboxes/${inboxId}/conversations${queryString ? `?${queryString}` : ''}`;
        return this.request('GET', path);
    }
    /**
     * Retrieves all messages in a conversation.
     * @param conversationId - ID of the conversation
     * @returns Promise that resolves with the paginated message results
     */
    async listConversationMessages(conversationId) {
        const path = `/conversations/${conversationId}/messages`;
        return this.request('GET', path);
    }
    /**
     * Retrieves all messages from an inbox by fetching all conversations and their messages.
     * @param inboxId - ID of the inbox
     * @param params - Query parameters for filtering conversations and messages
     * @returns Promise that resolves with both conversations and their messages
     */
    async listInboxMessages(inboxId, params = {}) {
        // Set status to 'open' if onlyUnresolved is true
        if (params.onlyUnresolved) {
            params.status = 'open';
        }
        // First, get the list of conversations from the inbox
        const conversationsResponse = await this.listInboxConversations(inboxId, params);
        // Get messages for each conversation
        const messagesPromises = conversationsResponse._results.map(conversation => this.listConversationMessages(conversation.id));
        const messagesResponses = await Promise.all(messagesPromises);
        // Flatten all messages into a single array
        const allMessages = messagesResponses.flatMap(response => response._results);
        return {
            conversations: conversationsResponse._results,
            messages: allMessages,
        };
    }
}
