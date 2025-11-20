#!/usr/bin/env python3
"""
MCP Windsurf Server - Fast Version
Optimized for Windsurf with lazy initialization
"""

import sys
import json
import logging
import os
import signal
from pathlib import Path
from typing import Any, Dict, List, Optional

# ============================================================================
# LOGGING (to file only, not stdout)
# ============================================================================

def setup_logging():
    """Setup logging to file"""
    log_dir = Path(__file__).parent.parent / "logs"
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
    
    # Also log to stderr for debugging
    stderr_handler = logging.StreamHandler(sys.stderr)
    stderr_handler.setLevel(logging.DEBUG)
    stderr_handler.setFormatter(formatter)
    logger.addHandler(stderr_handler)
    
    return logger

# ============================================================================
# MCP WINDSURF SERVER - FAST
# ============================================================================

class MCPWindsurfServerFast:
    """MCP Server for Windsurf - Fast initialization with lazy loading"""
    
    def __init__(self):
        self.logger = setup_logging()
        self.server = None
        self.project_root = None
        self.running = True
        self.logger.info("=" * 80)
        self.logger.info("🚀 MCP Windsurf Server initializing (FAST)...")
        self.logger.info(f"📌 Python: {sys.version}")
        self.logger.info(f"📌 PID: {os.getpid()}")
        self.logger.info(f"📌 PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}")
        self.logger.info(f"📌 PROJECT_ROOT: {os.environ.get('PROJECT_ROOT', 'NOT SET')}")
        self.logger.info("=" * 80)
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self._handle_signal)
        signal.signal(signal.SIGINT, self._handle_signal)
        
        try:
            # Get project root from environment or calculate it
            env_project_root = os.environ.get('PROJECT_ROOT')
            
            if env_project_root:
                self.project_root = Path(env_project_root).resolve()
                self.logger.info(f"📁 Project root (from env): {self.project_root}")
            else:
                # Fallback: calculate from script location
                script_dir = Path(__file__).parent.resolve()  # /Users/dev/Documents/GitHub/atlas4/codemap-system/core
                codemap_system_dir = script_dir.parent.resolve()  # /Users/dev/Documents/GitHub/atlas4/codemap-system
                self.project_root = codemap_system_dir.parent.resolve()  # /Users/dev/Documents/GitHub/atlas4
                self.logger.info(f"📁 Script dir: {script_dir}")
                self.logger.info(f"📁 Codemap system dir: {codemap_system_dir}")
                self.logger.info(f"📁 Project root (calculated): {self.project_root}")
            
            self.logger.info("✅ MCP Windsurf Server ready (lazy initialization)")
        except Exception as e:
            self.logger.error(f"❌ Error initializing server: {e}", exc_info=True)
            sys.exit(1)
    
    def _handle_signal(self, signum, frame):
        """Handle termination signals"""
        self.logger.info(f"📡 Received signal {signum}")
        self.running = False
    
    def _get_server(self):
        """Lazy load the enhanced server on first use"""
        if self.server is None:
            self.logger.info("📦 Loading Enhanced MCP Server (lazy)...")
            sys.path.insert(0, str(Path(__file__).parent))
            sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))
            
            from mcp_enhanced_server import EnhancedCodemapMCPServer
            self.server = EnhancedCodemapMCPServer(str(self.project_root))
            self.logger.info("✅ Enhanced MCP Server loaded")
        
        return self.server
    
    def handle_initialize(self) -> Dict[str, Any]:
        """Handle initialize request from Windsurf"""
        try:
            self.logger.info("🔧 Initializing...")
            
            # Get server to list resources and tools
            server = self._get_server()
            resources = server.get_resources()
            tools = server.get_tools()
            
            self.logger.info(f"📊 Resources: {len(resources)}")
            self.logger.info(f"🔧 Tools: {len(tools)}")
            
            # Log resources and tools for debugging
            self.logger.debug(f"Resources list: {[r.get('name', 'unknown') for r in resources]}")
            self.logger.debug(f"Tools list: {[t.get('name', 'unknown') for t in tools]}")
            
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
    
    def _format_response(self, req_id: Any, result: Optional[Dict[str, Any]] = None, error: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Format a JSON-RPC 2.0 response object."""
        response: Dict[str, Any] = {"jsonrpc": "2.0", "id": req_id}
        if error is not None:
            response["error"] = error
        else:
            # Ensure we always return an object as result
            response["result"] = result if isinstance(result, dict) else {"result": result}
        return response
    
    def run(self):
        """Main server loop - read from stdin, write to stdout"""
        self.logger.info("=" * 80)
        self.logger.info("🌐 MCP Windsurf Server started (FAST)")
        self.logger.info("📡 Waiting for requests from Windsurf...")
        self.logger.info(f"📌 stdin: {sys.stdin}")
        self.logger.info(f"📌 stdout: {sys.stdout}")
        self.logger.info("=" * 80)
        
        try:
            while self.running:
                try:
                    # Read request (supports both JSON line and JSON-RPC with Content-Length)
                    self.logger.debug("⏳ Waiting for request...")
                    line = sys.stdin.readline()
                    if not line:
                        self.logger.info("📭 EOF on stdin - Windsurf closed connection")
                        break
                    self.logger.debug(f"📥 Received line: {line[:100]}")

                    raw_payload: Optional[str] = None
                    header = line.strip()

                    if header.lower().startswith("content-length:"):
                        # JSON-RPC framed message; read headers until blank line, then read the payload
                        try:
                            parts = header.split(":", 1)
                            content_length = int(parts[1].strip()) if len(parts) > 1 else 0
                        except Exception:
                            content_length = 0

                        # Consume remaining headers until blank line
                        while True:
                            h = sys.stdin.readline()
                            if not h or h.strip() == "":
                                break

                        if content_length > 0:
                            raw_bytes = sys.stdin.buffer.read(content_length)
                            raw_payload = raw_bytes.decode("utf-8", errors="replace")
                        else:
                            # No valid length; skip
                            continue
                    else:
                        # Fallback: newline-delimited JSON
                        raw_payload = header

                    if not raw_payload:
                        continue

                    try:
                        request = json.loads(raw_payload)
                        method = request.get("method", "unknown")
                        req_id = request.get("id")
                        
                        # Handle notifications (no id)
                        is_notification = "id" not in request
                        self.logger.info(f"📨 Request: {method} (id={req_id}, notification={is_notification})")
                        self.logger.debug(f"   Full request: {raw_payload[:200]}")
                        
                        # Route request and build result payload
                        self.logger.info(f"🔄 Processing method: {method}")
                        response_obj = None
                        
                        if method == "initialize":
                            result = self.handle_initialize()
                            response_obj = self._format_response(req_id, result=result)
                        elif method == "initialized":
                            # Notification - no response needed
                            self.logger.info("✅ Client initialized")
                            response_obj = None
                        elif method == "resources/list":
                            result = self.handle_list_resources()
                            response_obj = self._format_response(req_id, result=result)
                        elif method == "tools/list":
                            result = self.handle_list_tools()
                            response_obj = self._format_response(req_id, result=result)
                        elif method == "tools/call":
                            result = self.handle_call_tool(
                                request.get("params", {}).get("name"),
                                request.get("params", {}).get("arguments", {})
                            )
                            # Ensure tool call result is wrapped as MCP content inside result
                            if isinstance(result, dict) and "content" in result:
                                response_obj = self._format_response(req_id, result=result)
                            else:
                                response_obj = self._format_response(req_id, result={"content": [{"type": "text", "text": json.dumps(result)}]})
                        else:
                            self.logger.warning(f"⚠️ Unknown method: {method}")
                            response_obj = self._format_response(req_id, error={"code": -32601, "message": f"Unknown method: {method}"})
                        
                        # Send JSON-RPC response only if not a notification
                        if response_obj is not None:
                            response_text = json.dumps(response_obj)
                            # Write as framed JSON-RPC (Content-Length) expected by MCP
                            try:
                                encoded = response_text.encode("utf-8")
                                sys.stdout.write(f"Content-Length: {len(encoded)}\r\n\r\n")
                                sys.stdout.flush()
                                sys.stdout.buffer.write(encoded)
                                sys.stdout.buffer.flush()
                            except Exception:
                                # Fallback to newline-delimited if buffered write fails
                                sys.stdout.write(response_text + "\n")
                                sys.stdout.flush()
                            self.logger.debug(f"✅ Response sent for {method} (id={req_id})")
                        else:
                            self.logger.debug(f"✅ Notification handled: {method}")
                        
                    except json.JSONDecodeError as e:
                        self.logger.error(f"❌ JSON decode error: {e}")
                        error_obj = self._format_response(None, error={"code": -32700, "message": "Invalid JSON"})
                        response_text = json.dumps(error_obj)
                        try:
                            encoded = response_text.encode("utf-8")
                            sys.stdout.write(f"Content-Length: {len(encoded)}\r\n\r\n")
                            sys.stdout.flush()
                            sys.stdout.buffer.write(encoded)
                            sys.stdout.buffer.flush()
                        except Exception:
                            sys.stdout.write(response_text + "\n")
                            sys.stdout.flush()
                
                except BrokenPipeError:
                    self.logger.info("🔌 Broken pipe - Windsurf disconnected")
                    break
                except Exception as e:
                    self.logger.error(f"❌ Error processing request: {e}", exc_info=True)
        
        except KeyboardInterrupt:
            self.logger.info("⏹️ Server interrupted by user")
        except Exception as e:
            self.logger.error(f"❌ Server error: {e}", exc_info=True)
        finally:
            self.logger.info("🛑 Server stopped")

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    server = MCPWindsurfServerFast()
    server.run()
