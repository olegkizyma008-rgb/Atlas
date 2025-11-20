#!/usr/bin/env python3
"""
HTTP MCP SERVER FOR WINDSURF
Більш надійний HTTP транспорт для MCP
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any
from flask import Flask, request, jsonify
import sys

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging():
    """Setup logging to file"""
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "mcp_http_server.log"
    
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

logger = setup_logging()

# ============================================================================
# HTTP MCP SERVER
# ============================================================================

app = Flask(__name__)

class MCPHTTPServer:
    """HTTP MCP Server for Windsurf"""
    
    def __init__(self):
        self.logger = logger
        self.server = None
        self.project_root = None
        
        self.logger.info("=" * 80)
        self.logger.info("🚀 HTTP MCP Server initializing...")
        self.logger.info(f"📌 Python: {sys.version}")
        self.logger.info("=" * 80)
        
        # Get project root from environment
        import os
        env_project_root = os.environ.get('PROJECT_ROOT')
        if env_project_root:
            self.project_root = Path(env_project_root).resolve()
            self.logger.info(f"📁 Project root (from env): {self.project_root}")
        else:
            script_dir = Path(__file__).parent.resolve()
            self.project_root = script_dir.parent.parent
            self.logger.info(f"📁 Project root (calculated): {self.project_root}")
    
    def _get_server(self):
        """Lazy load Enhanced MCP Server"""
        if self.server is None:
            self.logger.info("📦 Loading Enhanced MCP Server (lazy)...")
            sys.path.insert(0, str(Path(__file__).parent))
            sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))
            
            from mcp_enhanced_server import EnhancedCodemapMCPServer
            self.server = EnhancedCodemapMCPServer(str(self.project_root))
            self.logger.info("✅ Enhanced MCP Server loaded")
        
        return self.server
    
    def handle_initialize(self) -> Dict[str, Any]:
        """Handle initialize request"""
        try:
            self.logger.info("🔧 Initializing...")
            
            server = self._get_server()
            resources = server.get_resources()
            tools = server.get_tools()
            
            self.logger.info(f"📊 Resources: {len(resources)}")
            self.logger.info(f"🔧 Tools: {len(tools)}")
            
            return {
                "protocolVersion": "2025-03-26",
                "capabilities": {
                    "resources": {
                        "listChanged": True
                    },
                    "tools": {
                        "listChanged": True
                    }
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
            server = self._get_server()
            resources = server.get_resources()
            self.logger.info(f"📋 Listing {len(resources)} resources")
            
            return {"resources": resources}
        except Exception as e:
            self.logger.error(f"❌ Error listing resources: {e}", exc_info=True)
            return {"error": str(e)}
    
    def handle_list_tools(self) -> Dict[str, Any]:
        """Handle list tools request"""
        try:
            server = self._get_server()
            tools = server.get_tools()
            self.logger.info(f"🔧 Listing {len(tools)} tools")
            
            return {"tools": tools}
        except Exception as e:
            self.logger.error(f"❌ Error listing tools: {e}", exc_info=True)
            return {"error": str(e)}
    
    def handle_call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool call request"""
        try:
            server = self._get_server()
            self.logger.info(f"🔨 Calling tool: {name}")
            
            result = server.call_tool(name, arguments)
            
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

# Initialize server
mcp_server = MCPHTTPServer()

# ============================================================================
# FLASK ROUTES
# ============================================================================

@app.route('/mcp', methods=['POST'])
def mcp_endpoint():
    """Main MCP endpoint"""
    try:
        data = request.get_json()
        method = data.get('method', 'unknown')
        
        mcp_server.logger.info(f"📨 Request: {method}")
        
        if method == 'initialize':
            result = mcp_server.handle_initialize()
        elif method == 'resources/list':
            result = mcp_server.handle_list_resources()
        elif method == 'tools/list':
            result = mcp_server.handle_list_tools()
        elif method == 'tools/call':
            result = mcp_server.handle_call_tool(
                data.get('params', {}).get('name'),
                data.get('params', {}).get('arguments', {})
            )
        else:
            mcp_server.logger.warning(f"⚠️ Unknown method: {method}")
            result = {"error": f"Unknown method: {method}"}
        
        mcp_server.logger.info(f"✅ Response sent for {method}")
        return jsonify(result)
    
    except Exception as e:
        mcp_server.logger.error(f"❌ Error processing request: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "mcp_ready": True,
        "version": "2.0.0"
    })

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    import os
    
    # Use environment variable for port, default to 5000
    port = int(os.environ.get('MCP_PORT', 5000))
    host = os.environ.get('MCP_HOST', 'localhost')
    
    mcp_server.logger.info("🌐 Starting HTTP MCP Server...")
    mcp_server.logger.info(f"📡 Listening on http://{host}:{port}/mcp")
    
    app.run(host=host, port=port, debug=False, threaded=True)
