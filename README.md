# frontapp-mcp-server

This is an MCP Server for [Front](https://front.com/) that allows you to integrate with Front's API.

## What is Front?

Front is a customer communication platform that helps teams deliver better service through efficient email management, messaging, and customer interactions.

## Installation

Add the following configuration to your MCP server setup:

```json
"frontApi": {
  "command": "npx",
  "args": [
        "-y",
        "@iktakahiro/frontapp-mcp-server"
      ],
  "env": {
    "FRONT_API_TOKEN": "YOUR_API_TOKEN",
    "DEFAULT_INBOX_ID": "YOUR_INBOX_ID"
  }
}
```

Make sure to replace `YOUR_API_TOKEN` with your Front API token and `YOUR_INBOX_ID` with your default inbox ID.

## Note

This repository is still experimental and currently only implements functionality to retrieve messages. Additional features are planned for future implementation.
