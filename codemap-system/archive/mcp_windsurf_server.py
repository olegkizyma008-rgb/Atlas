#!/usr/bin/env python3
"""
MCP Windsurf Server - Simplified for Windsurf Integration
Communicates via stdio with Windsurf
"""

import sys
import json
import logging
from pathlib import Path
from typing import Any, Dict, List

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))

from mcp_enhanced_server import EnhancedCodemapMCPServer

# ============================================================================
# LOGGING (to file only, not stdout)
# ============================================================================

def setup_logging():
    """Setup logging to file"""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "mcp_windsurf_server.log"
    
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.DEBUG)
    logger.handlers = []
    
    handler = logging.FileHandler(log_file, encoding='utf-8')
    handler.setLevel(logging.DEBUG)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    
    return logger

# ============================================================================
# MCP WINDSURF SERVER
# ============================================================================

class MCPWindsurfServer:
    """MCP Server for Windsurf - Communicates via stdio"""
    
    def __init__(self):
        self.logger = setup_logging()
        self.server = None
        self.logger.info("🚀 MCP Windsurf Server initializing...")
        
        try:
            # Get project root (absolute path)
            script_dir = Path(__file__).parent.resolve()
            project_root = script_dir.parent.resolve()
            
            self.logger.info(f"📁 Project root: {project_root}")
            
            # Initialize enhanced server with absolute path
            self.server = EnhancedCodemapMCPServer(str(project_root))
            self.logger.info("✅ Enhanced MCP Server initialized")
        except Exception as e:
            self.logger.error(f"❌ Error initializing server: {e}", exc_info=True)
            sys.exit(1)
    
    def handle_initialize(self) -> Dict[str, Any]:
        """Handle initialize request from Windsurf"""
        try:
            if not self.server:
                raise RuntimeError("Server not initialized")
            
            resources = self.server.get_resources()
            tools = self.server.get_tools()
            
            self.logger.info(f"📊 Resources: {len(resources)}, Tools: {len(tools)}")
            
            return {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "resources": {},
                    "tools": {}
                },
                "serverInfo": {
                    "name": "Orchestrator Codemap",
                    "version": "2.0.0"
                }
            }
        except Exception as e:
            self.logger.error(f"❌ Error in initialize: {e}", exc_info=True)
            return {"error": str(e)}
    
    def handle_list_resources(self) -> Dict[str, Any]:
        """Handle list resources request"""
        try:
            if not self.server:
                raise RuntimeError("Server not initialized")
            
            resources = self.server.get_resources()
            self.logger.info(f"📋 Listing {len(resources)} resources")
            
            return {
                "resources": resources
            }
        except Exception as e:
            self.logger.error(f"❌ Error listing resources: {e}", exc_info=True)
            return {"error": str(e)}
    
    def handle_list_tools(self) -> Dict[str, Any]:
        """Handle list tools request"""
        try:
            if not self.server:
                raise RuntimeError("Server not initialized")
            
            tools = self.server.get_tools()
            self.logger.info(f"🔧 Listing {len(tools)} tools")
            
            return {
                "tools": tools
            }
        except Exception as e:
            self.logger.error(f"❌ Error listing tools: {e}", exc_info=True)
            return {"error": str(e)}
    
    def handle_call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool call request"""
        try:
            if not self.server:
                raise RuntimeError("Server not initialized")
            
            self.logger.info(f"🔨 Calling tool: {name}")
            
            result = self.server.call_tool(name, arguments)
            
            self.logger.info(f"✅ Tool {name} completed")
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2)
                    }
                ]
            }
        except Exception as e:
            self.logger.error(f"❌ Error calling tool {name}: {e}", exc_info=True)
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Error: {str(e)}"
                    }
                ]
            }
    
    def run(self):
        """Main server loop - read from stdin, write to stdout"""
        self.logger.info("🌐 MCP Windsurf Server started")
        
        try:
            while True:
                # Read line from stdin
                line = sys.stdin.readline()
                if not line:
                    break
                
                try:
                    request = json.loads(line)
                    self.logger.debug(f"📨 Request: {request.get('method', 'unknown')}")
                    
                    # Route request
                    method = request.get("method")
                    
                    if method == "initialize":
                        response = self.handle_initialize()
                    elif method == "resources/list":
                        response = self.handle_list_resources()
                    elif method == "tools/list":
                        response = self.handle_list_tools()
                    elif method == "tools/call":
                        response = self.handle_call_tool(
                            request.get("params", {}).get("name"),
                            request.get("params", {}).get("arguments", {})
                        )
                    else:
                        response = {"error": f"Unknown method: {method}"}
                    
                    # Send response
                    sys.stdout.write(json.dumps(response) + "\n")
                    sys.stdout.flush()
                    
                except json.JSONDecodeError as e:
                    self.logger.error(f"❌ JSON decode error: {e}")
                    sys.stdout.write(json.dumps({"error": "Invalid JSON"}) + "\n")
                    sys.stdout.flush()
        
        except KeyboardInterrupt:
            self.logger.info("⏹️ Server interrupted")
        except Exception as e:
            self.logger.error(f"❌ Server error: {e}", exc_info=True)
        finally:
            self.logger.info("🛑 Server stopped")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    server = MCPWindsurfServer()
    server.run()
