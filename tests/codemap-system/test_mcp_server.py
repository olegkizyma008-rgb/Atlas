#!/usr/bin/env python3
"""
Simple test script for MCP Architecture Server
"""

import subprocess
import json
import sys
import time

def test_mcp_server():
    """Test MCP server functionality"""
    print("🧪 Testing MCP Architecture Server...")
    
    process = None
    try:
        # Test 1: Initialize server
        print("\n1. Testing server initialization...")
        process = subprocess.Popen(
            [sys.executable, "mcp_architecture_server.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd="/Users/dev/Documents/GitHub/atlas4/codemap-system"
        )
        
        # Ensure stdin and stdout are not None
        if process.stdin is None or process.stdout is None:
            print("❌ Failed to create process with proper IO")
            return
        
        # Send initialize request
        init_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        process.stdin.write(json.dumps(init_request) + "\n")
        process.stdin.flush()
        
        # Read response
        response_line = process.stdout.readline()
        if response_line:
            response = json.loads(response_line.strip())
            if "result" in response:
                print("✅ Server initialization successful")
            else:
                print("❌ Server initialization failed")
                print(f"Response: {response}")
        else:
            print("❌ No response from server")
            
        # Test 2: List tools
        print("\n2. Testing tools list...")
        tools_request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }
        
        process.stdin.write(json.dumps(tools_request) + "\n")
        process.stdin.flush()
        
        response_line = process.stdout.readline()
        if response_line:
            response = json.loads(response_line.strip())
            if "result" in response and "tools" in response["result"]:
                tools = response["result"]["tools"]
                print(f"✅ Tools list successful ({len(tools)} tools found)")
                for tool in tools[:3]:  # Show first 3 tools
                    print(f"   - {tool['name']}: {tool['description']}")
            else:
                print("❌ Tools list failed")
                print(f"Response: {response}")
        else:
            print("❌ No response for tools list")
            
        # Test 3: Call a tool
        print("\n3. Testing tool call...")
        tool_request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "analyze_architecture",
                "arguments": {
                    "depth": 1
                }
            }
        }
        
        process.stdin.write(json.dumps(tool_request) + "\n")
        process.stdin.flush()
        
        # Give it more time for analysis
        time.sleep(2)
        
        response_line = process.stdout.readline()
        if response_line:
            response = json.loads(response_line.strip())
            if "result" in response:
                print("✅ Tool call successful")
                content = response["result"]["content"][0]["text"]
                if len(content) > 200:
                    print(f"   Response: {content[:200]}...")
                else:
                    print(f"   Response: {content}")
            else:
                print("❌ Tool call failed")
                print(f"Response: {response}")
        else:
            print("❌ No response for tool call")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
    finally:
        if process is not None:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()
    
    print("\n🎉 MCP Server test completed!")

if __name__ == "__main__":
    test_mcp_server()
