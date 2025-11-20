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
        """Initialize all 16 available tools"""
        return [
            {
                "name": "analyze_file_deeply",
                "description": "Глибокий аналіз файлу: структура, функції, залежності, якість коду",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу для аналізу"}
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
                        "directory": {"type": "string", "description": "Директорія для пошуку дублікатів"}
                    },
                    "required": ["directory"]
                }
            },
            {
                "name": "generate_refactoring_plan",
                "description": "Генерувати план рефакторингу на основі аналізу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "priority": {"type": "string", "enum": ["low", "medium", "high"], "description": "Пріоритет"}
                    }
                }
            },
            {
                "name": "analyze_impact",
                "description": "Аналіз впливу змін на інші модулі",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
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
                        "directory": {"type": "string", "description": "Директорія для аналізу"}
                    }
                }
            },
            {
                "name": "detect_code_smells",
                "description": "Виявити code smells та потенційні проблеми",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "generate_documentation",
                "description": "Генерувати документацію для файлу або функції",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "analyze_dependencies",
                "description": "Аналіз залежностей файлу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "security_scan",
                "description": "Сканування безпеки: виявлення вразливостей",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {"type": "string", "description": "Директорія для сканування"}
                    }
                }
            },
            {
                "name": "performance_analysis",
                "description": "Аналіз продуктивності: виявлення вузьких місць",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "test_coverage",
                "description": "Аналіз покриття тестами",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {"type": "string", "description": "Директорія для аналізу"}
                    }
                }
            },
            {
                "name": "architecture_review",
                "description": "Огляд архітектури проекту",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {"type": "string", "description": "Директорія проекту"}
                    }
                }
            },
            {
                "name": "complexity_analysis",
                "description": "Аналіз складності коду (циклічна складність)",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "code_quality_metrics",
                "description": "Метрики якості коду",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "refactoring_suggestions",
                "description": "Пропозиції для рефакторингу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "project_health_report",
                "description": "Загальний звіт про здоров'я проекту",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "directory": {"type": "string", "description": "Директорія проекту"}
                    }
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
        
        # Обробка всіх 16 інструментів
        if tool_name == "analyze_file_deeply":
            result = self.analyze_file_deeply(tool_args.get("file_path"))
        elif tool_name == "find_duplicates":
            result = self.find_duplicates(tool_args.get("directory"))
        elif tool_name == "generate_refactoring_plan":
            result = self.generate_refactoring_plan(tool_args.get("priority", "medium"))
        elif tool_name == "analyze_impact":
            result = self.analyze_impact(tool_args.get("file_path"))
        elif tool_name == "find_dead_code":
            result = self.find_dead_code(tool_args.get("directory"))
        elif tool_name == "detect_code_smells":
            result = self.detect_code_smells(tool_args.get("file_path"))
        elif tool_name == "generate_documentation":
            result = self.generate_documentation(tool_args.get("file_path"))
        elif tool_name == "analyze_dependencies":
            result = self.analyze_dependencies(tool_args.get("file_path"))
        elif tool_name == "security_scan":
            result = self.security_scan(tool_args.get("directory"))
        elif tool_name == "performance_analysis":
            result = self.performance_analysis(tool_args.get("file_path"))
        elif tool_name == "test_coverage":
            result = self.test_coverage(tool_args.get("directory"))
        elif tool_name == "architecture_review":
            result = self.architecture_review(tool_args.get("directory"))
        elif tool_name == "complexity_analysis":
            result = self.complexity_analysis(tool_args.get("file_path"))
        elif tool_name == "code_quality_metrics":
            result = self.code_quality_metrics(tool_args.get("file_path"))
        elif tool_name == "refactoring_suggestions":
            result = self.refactoring_suggestions(tool_args.get("file_path"))
        elif tool_name == "project_health_report":
            result = self.project_health_report(tool_args.get("directory"))
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
    
    def analyze_impact(self, file_path: str) -> str:
        """Analyze impact of changes"""
        try:
            return f"📊 Аналіз впливу змін у {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def detect_code_smells(self, file_path: str) -> str:
        """Detect code smells"""
        try:
            return f"👃 Виявлення code smells у {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def generate_documentation(self, file_path: str) -> str:
        """Generate documentation"""
        try:
            return f"📚 Генерування документації для {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def security_scan(self, directory: Optional[str] = None) -> str:
        """Security scan"""
        try:
            return f"🔒 Сканування безпеки у {directory or 'проекті'}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def performance_analysis(self, file_path: str) -> str:
        """Performance analysis"""
        try:
            return f"⚡ Аналіз продуктивності {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def test_coverage(self, directory: Optional[str] = None) -> str:
        """Test coverage analysis"""
        try:
            return f"🧪 Аналіз покриття тестами у {directory or 'проекті'}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def architecture_review(self, directory: Optional[str] = None) -> str:
        """Architecture review"""
        try:
            return f"🏗️ Огляд архітектури {directory or 'проекту'}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def complexity_analysis(self, file_path: str) -> str:
        """Complexity analysis"""
        try:
            return f"📈 Аналіз складності {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def code_quality_metrics(self, file_path: str) -> str:
        """Code quality metrics"""
        try:
            return f"📊 Метрики якості коду {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def refactoring_suggestions(self, file_path: str) -> str:
        """Refactoring suggestions"""
        try:
            return f"💡 Пропозиції рефакторингу для {file_path}:\n(Функція в розробці)"
        except Exception as e:
            return f"❌ Помилка: {str(e)}"
    
    def project_health_report(self, directory: Optional[str] = None) -> str:
        """Project health report"""
        try:
            py_files = list(self.project_root.rglob("*.py"))
            js_files = list(self.project_root.rglob("*.js"))
            
            report = {
                "project": str(self.project_root),
                "python_files": len(py_files),
                "javascript_files": len(js_files),
                "health_status": "good",
                "timestamp": datetime.now().isoformat()
            }
            
            return f"❤️ Звіт про здоров'я проекту:\n" + json.dumps(report, indent=2, ensure_ascii=False)
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
