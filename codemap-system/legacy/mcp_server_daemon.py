#!/usr/bin/env python3
"""
MCP Server Daemon
Runs MCP server as a persistent daemon for Windsurf integration
"""

import sys
import os
import json
import logging
from pathlib import Path
from datetime import datetime

# Add project to path
sys.path.insert(0, str(Path(__file__).parent))

from mcp_enhanced_server import EnhancedCodemapMCPServer

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging():
    """Setup logging"""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "mcp_daemon.log"
    
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
# DAEMON
# ============================================================================

class MCPServerDaemon:
    """MCP Server Daemon for Windsurf"""
    
    def __init__(self):
        self.logger = setup_logging()
        self.server = None
        self.logger.info("🚀 MCP Server Daemon initialized")
    
    def start(self):
        """Start MCP server"""
        try:
            self.logger.info("🌐 Starting Enhanced MCP Server...")
            
            # Initialize server
            self.server = EnhancedCodemapMCPServer()
            
            # Get resources and tools
            resources = self.server.get_resources()
            tools = self.server.get_tools()
            
            self.logger.info("✅ MCP Server started successfully")
            self.logger.info(f"📊 Resources: {len(resources)}")
            self.logger.info(f"🔧 Tools: {len(tools)}")
            
            # Print to stdout for Windsurf
            print("✅ Enhanced MCP Server ready")
            print(f"📊 Resources: {len(resources)}")
            print(f"🔧 Tools: {len(tools)}")
            
            # Keep running
            import time
            while True:
                time.sleep(1)
        
        except Exception as e:
            self.logger.error(f"❌ Error starting MCP Server: {e}", exc_info=True)
            print(f"❌ Error: {e}")
            sys.exit(1)

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    daemon = MCPServerDaemon()
    daemon.start()
