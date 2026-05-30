import asyncio
import sys
import os
from contextlib import AsyncExitStack
from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Claude model constant
ANTHROPIC_MODEL = "claude-sonnet-4-5"
MAX_TOOL_TURNS = 10


class MCPClient:
    def __init__(self, server_script_path: str):
        self.server_script_path = server_script_path
        # Initialize Anthropic client (reads ANTHROPIC_API_KEY from environment)
        self.anthropic = Anthropic()
        self.session = None
        self.exit_stack = AsyncExitStack()

    async def connect(self):
        """Connect to the MCP server"""
        server_params = StdioServerParameters(
            command="python",
            args=[self.server_script_path],
            env=None
        )
        
        # Enter stdio_client context
        read_stream, write_stream = await self.exit_stack.enter_async_context(
            stdio_client(server_params)
        )
        
        # Enter ClientSession context
        self.session = await self.exit_stack.enter_async_context(
            ClientSession(read_stream, write_stream)
        )
        
        # Initialize the session
        await self.session.initialize()

    async def disconnect(self):
        """Gracefully close the connection"""
        await self.exit_stack.aclose()

    async def process_query(self, query: str) -> str:
        """Process a query using Claude and available tools"""
        messages = [{"role": "user", "content": query}]

        tools_response = await self.session.list_tools()
        available_tools = [
            {"name": tool.name, "description": tool.description, "input_schema": tool.inputSchema}
            for tool in tools_response.tools
        ]

        # Initial Claude API call
        response = self.anthropic.messages.create(
            model=ANTHROPIC_MODEL, max_tokens=1000, messages=messages, tools=available_tools
        )

        # Process response and handle tool calls
        final_text = []

        for _ in range(MAX_TOOL_TURNS):
            tool_uses = []
            for content in response.content:
                if content.type == "text":
                    final_text.append(content.text)
                elif content.type == "tool_use":
                    tool_uses.append(content)

            if not tool_uses:
                return "\n".join(final_text)

            tool_results = []
            for tool_use in tool_uses:
                result = await self.session.call_tool(tool_use.name, tool_use.input)
                final_text.append(f"[Calling tool {tool_use.name} with args {tool_use.input}]")
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": result.content,
                    }
                )

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

            response = self.anthropic.messages.create(
                model=ANTHROPIC_MODEL,
                max_tokens=1000,
                messages=messages,
                tools=available_tools,
            )

        final_text.append(f"[Stopped after {MAX_TOOL_TURNS} tool-use turns]")
        return "\n".join(final_text)

    async def chat_loop(self):
        """Interactive chat loop"""
        print("MCP Client Connected. Type 'quit' to exit.")
        while True:
            try:
                query = await asyncio.to_thread(input, "\nQuery: ")
                query = query.strip()
            except (EOFError, KeyboardInterrupt):
                break

            if query.lower() == "quit":
                break

            if not query:
                continue

            try:
                response = await self.process_query(query)
                print("\n" + response)
            except Exception as e:
                print(f"\nError: {str(e)}")


async def main():
    if len(sys.argv) < 2:
        print("Usage: python client.py <path_to_server_script>")
        sys.exit(1)
        
    server_path = sys.argv[1]
    client = MCPClient(server_path)
    try:
        await client.connect()
        await client.chat_loop()
    finally:
        await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
