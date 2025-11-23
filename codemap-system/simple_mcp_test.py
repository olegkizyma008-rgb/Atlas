#!/usr/bin/env python3
"""
Simple MCP server test
"""

import subprocess
import json
import sys
import time

def test_mcp_quick():
    """Quick test of MCP server"""
    print("🧪 Quick MCP Server Test...")
    
    process = None
    try:
        # Start server
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
        
        # Test tools list
        tools_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list"
        }
        
        print("Sending tools/list request...")
        process.stdin.write(json.dumps(tools_request) + "\n")
        process.stdin.flush()
        
        # Wait for response with timeout
        start_time = time.time()
        response_line = None
        
        while time.time() - start_time < 5:  # 5 second timeout
            if process.poll() is not None:
                break  # Process ended
                
            # Try to read a line
            line = process.stdout.readline()
            if line:
                response_line = line.strip()
                break
                
            time.sleep(0.1)
        
        if response_line:
            try:
                response = json.loads(response_line)
                if "result" in response and "tools" in response["result"]:
                    tools = response["result"]["tools"]
                    print(f"✅ SUCCESS: Found {len(tools)} tools")
                    for tool in tools[:3]:
                        print(f"   - {tool['name']}")
                else:
                    print(f"❌ Invalid response format: {response}")
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"Raw response: {response_line}")
        else:
            print("❌ No response received within timeout")
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
    finally:
        # Clean up
        if process is not None:
            try:
                process.terminate()
                process.wait(timeout=3)
            except:
                try:
                    process.kill()
                except:
                    pass
    
    print("Test completed!")

if __name__ == "__main__":
    test_mcp_quick()
