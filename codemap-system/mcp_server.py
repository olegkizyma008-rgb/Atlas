#!/usr/bin/env python3
"""
MCP Server for Windsurf Cascade
Реалізує стандартний MCP протокол (JSON-RPC через stdio)
"""

import json
import sys
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))


class MCPServer:
    """MCP Server implementing JSON-RPC protocol over stdio"""
    
    def __init__(self):
        self.project_root = Path(os.environ.get('PROJECT_ROOT', Path(__file__).parent.parent))
        self.codemap_dir = Path(__file__).parent
        self.reports_dir = self.codemap_dir / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        self.tools = self._initialize_tools()
        self.request_id = 0
    
    def _initialize_tools(self) -> List[Dict[str, Any]]:
        """Initialize all available tools"""
        return [
            {
                "name": "analyze_file_deeply",
                "description": "Глибокий аналіз файлу: структура, функції, залежності, якість коду",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Шлях до файлу для аналізу"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "find_duplicates",
                "description": "Знайти дублікати коду в директорії",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Директорія для пошуку дублікатів"
                        }
                    },
                    "required": ["directory"]
                }
            },
            {
                "name": "analyze_dependencies",
                "description": "Аналіз залежностей файлу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {
                            "type": "string",
                            "description": "Шлях до файлу"
                        }
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "find_dead_code",
                "description": "Знайти мертвий код (невикористовувані функції, змінні)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {
                            "type": "string",
                            "description": "Директорія для аналізу"
                        }
                    }
                }
            },
            {
                "name": "generate_refactoring_plan",
                "description": "Генерувати план рефакторингу на основі аналізу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "priority": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "Пріоритет рефакторингу"
                        }
                    }
                }
            },
            {
                "name": "get_project_summary",
                "description": "Отримати загальну інформацію про проект",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            }
        ]
    
    def send_response(self, response: Dict[str, Any]) -> None:
        """Send JSON response to stdout"""
        json.dump(response, sys.stdout, ensure_ascii=False)
        sys.stdout.write('\n')
        sys.stdout.flush()
    
    def send_error(self, request_id: Optional[int], code: int, message: str) -> None:
        """Send error response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }
        self.send_response(response)
    
    def handle_initialize(self, request_id: int, params: Dict[str, Any]) -> None:
        """Handle initialize request"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "Codemap MCP Server",
                    "version": "1.0.0"
                }
            }
        }
        self.send_response(response)
    
    def handle_list_tools(self, request_id: int) -> None:
        """Handle tools/list request"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": self.tools
            }
        }
        self.send_response(response)
    
    def handle_call_tool(self, request_id: int, params: Dict[str, Any]) -> None:
        """Handle tool/call request"""
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        
        # Обробка інструментів
        if tool_name == "analyze_file_deeply":
            result = self.analyze_file_deeply(tool_args.get("file_path"))
        elif tool_name == "find_duplicates":
            result = self.find_duplicates(tool_args.get("directory"))
        elif tool_name == "analyze_dependencies":
            result = self.analyze_dependencies(tool_args.get("file_path"))
        elif tool_name == "find_dead_code":
            result = self.find_dead_code(tool_args.get("directory"))
        elif tool_name == "generate_refactoring_plan":
            result = self.generate_refactoring_plan(tool_args.get("priority", "medium"))
        elif tool_name == "get_project_summary":
            result = self.get_project_summary()
        else:
            self.send_error(request_id, -32601, f"Unknown tool: {tool_name}")
            return
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": result
                    }
                ]
            }
        }
        self.send_response(response)
    
    def analyze_file_deeply(self, file_path: str) -> str:
        """Analyze file deeply"""
        try:
            full_path = self.project_root / file_path
            if not full_path.exists():
                return f"❌ Файл не знайдено: {file_path}"
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            lines = content.split('\n')
            
            # Базовий аналіз
            analysis = {
                "file": file_path,
                "lines": len(lines),
                "size_bytes": len(content),
                "timestamp": datetime.now().isoformat(),
                "functions": self._count_functions(content),
                "classes": self._count_classes(content),
                "imports": self._count_imports(content),
            }
            
            return f"📊 Аналіз файлу {file_path}:\n" + json.dumps(analysis, indent=2, ensure_ascii=False)
        except Exception as e:
            return f"❌ Помилка при аналізі: {str(e)}"
    
    def find_duplicates(self, directory: str) -> str:
        """Find code duplicates"""
        try:
            search_dir = self.project_root / directory
            if not search_dir.exists():
                return f"❌ Директорія не знайдена: {directory}"
            
            return f"🔍 Пошук дублікатів у {directory}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def analyze_dependencies(self, file_path: str) -> str:
        """Analyze file dependencies"""
        try:
            full_path = self.project_root / file_path
            if not full_path.exists():
                return f"❌ Файл не знайдено: {file_path}"
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            imports = self._extract_imports(content)
            
            return f"🔗 Залежності файлу {file_path}:\n" + json.dumps(imports, indent=2, ensure_ascii=False)
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def find_dead_code(self, directory: Optional[str] = None) -> str:
        """Find dead code"""
        try:
            search_dir = self.project_root / directory if directory else self.project_root
            if not search_dir.exists():
                return f"❌ Директорія не знайдена: {directory}"
            
            return f"🔴 Пошук мертвого коду у {directory or 'проекті'}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def generate_refactoring_plan(self, priority: str = "medium") -> str:
        """Generate refactoring plan"""
        return f"📋 План рефакторингу (пріоритет: {priority}):\n(Функція в розробці)"
    
    def get_project_summary(self) -> str:
        """Get project summary"""
        try:
            # Підрахунок файлів
            py_files = list(self.project_root.rglob("*.py"))
            js_files = list(self.project_root.rglob("*.js"))
            
            summary = {
                "project_root": str(self.project_root),
                "python_files": len(py_files),
                "javascript_files": len(js_files),
                "reports_dir": str(self.reports_dir),
                "timestamp": datetime.now().isoformat()
            }
            
            return f"📊 Резюме проекту:\n" + json.dumps(summary, indent=2, ensure_ascii=False)
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def _count_functions(self, content: str) -> int:
        """Count functions in content"""
        return content.count("def ") + content.count("function ")
    
    def _count_classes(self, content: str) -> int:
        """Count classes in content"""
        return content.count("class ")
    
    def _count_imports(self, content: str) -> int:
        """Count imports in content"""
        return content.count("import ") + content.count("from ")
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract imports from content"""
        imports = []
        for line in content.split('\n'):
            line = line.strip()
            if line.startswith(('import ', 'from ')):
                imports.append(line)
        return imports
    
    def run(self) -> None:
        """Main server loop - read JSON-RPC requests from stdin"""
        try:
            for line in sys.stdin:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    request = json.loads(line)
                except json.JSONDecodeError:
                    self.send_error(None, -32700, "Parse error")
                    continue
                
                request_id = request.get("id")
                method = request.get("method")
                params = request.get("params", {})
                
                # Обробка методів
                if method == "initialize":
                    self.handle_initialize(request_id, params)
                elif method == "tools/list":
                    self.handle_list_tools(request_id)
                elif method == "tools/call":
                    self.handle_call_tool(request_id, params)
                else:
                    self.send_error(request_id, -32601, f"Unknown method: {method}")
        
        except KeyboardInterrupt:
            sys.exit(0)
        except Exception as e:
            print(f"❌ Fatal error: {e}", file=sys.stderr)
            sys.exit(1)


def main():
    """Main entry point"""
    server = MCPServer()
    server.run()


if __name__ == "__main__":
    main()
