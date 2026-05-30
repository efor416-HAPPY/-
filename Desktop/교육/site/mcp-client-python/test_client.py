import asyncio
import sys
import os
from client import MCPClient

async def main():
    if len(sys.argv) < 2:
        print("Usage: python test_client.py <path_to_server_script>")
        sys.exit(1)
        
    server_path = sys.argv[1]
    client = MCPClient(server_path)
    try:
        await client.connect()
        # Test query that requires the calendar and travel server
        query = "What past trips do I have to Spain, and what are my travel preferences for Europe?"
        print(f"Running query: {query}")
        response = await client.process_query(query)
        print("\nResponse:")
        print(response)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
