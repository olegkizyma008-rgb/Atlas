#!/usr/bin/env python3
"""
Test MCP server tool call
"""

import subprocess
import json
import sys
import time

def test_tool_call():
    """Test MCP server tool call"""
    print("🧪 Testing MCP Server Tool Call...")
    
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
        
        # Test architecture overview tool
        tool_request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "get_architecture_overview",
                "arguments": {}
            }
        }
        
        print("Calling get_architecture_overview tool...")
        process.stdin.write(json.dumps(tool_request) + "\n")
        process.stdin.flush()
        
        # Wait for response with timeout
        start_time = time.time()
        response_line = None
        
        while time.time() - start_time < 10:  # 10 second timeout for analysis
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
                if "result" in response and "content" in response["result"]:
                    content = response["result"]["content"][0]["text"]
                    print("✅ SUCCESS: Tool call successful")
                    print(f"Response length: {len(content)} characters")
                    if len(content) > 300:
                        print(f"Response preview: {content[:300]}...")
                    else:
                        print(f"Full response: {content}")
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
    
    print("Tool call test completed!")

if __name__ == "__main__":
    test_tool_call()
