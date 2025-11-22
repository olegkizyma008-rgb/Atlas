#!/usr/bin/env python3
"""
MCP Architecture Server v2.0 - Інтеграція з Windsurf IDE
Забезпечує MCP інструменти та WebSocket для real-time оновлень
"""

import json
import sys
import os
import asyncio
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging
from dotenv import load_dotenv

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper, FileStatus
from core.code_duplication_detector import CodeDuplicationDetector
from core.code_quality_analyzer import CodeQualityAnalyzer

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/mcp_architecture_server.log'),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)


class ArchitectureAnalysisServer:
    """MCP сервер для архітектурного аналізу з Windsurf інтеграцією"""
    
    def __init__(self):
        # Завантажуємо .env.architecture з папки сервера
        env_path = Path(__file__).parent.parent / '.env.architecture'
        if env_path.exists():
            load_dotenv(env_path)
        
        # Читаємо PROJECT_ROOT з .env.architecture
        project_root = os.environ.get('PROJECT_ROOT', '..')
        
        # Якщо відносний шлях, робимо його абсолютним від codemap-system
        if not os.path.isabs(project_root):
            project_root = Path(__file__).parent.parent / project_root
        
        self.project_root = Path(project_root).resolve()
        self.codemap_dir = Path(__file__).parent.parent
        self.reports_dir = self.codemap_dir / "reports"
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Ініціалізуємо архітектурні інструменти
        self.mapper = ArchitectureMapper(self.project_root)
        self.duplication_detector = CodeDuplicationDetector(self.project_root)
        self.quality_analyzer = CodeQualityAnalyzer(self.project_root)
        
        # Кеш архітектури
        self.architecture_cache = None
        self.last_analysis_time = None
        
        # Налаштування логування
        self._setup_logging()
        
        self.tools = self._initialize_architecture_tools()
        
        logger.info("🚀 MCP Architecture Server ініціалізований")
    
    def _setup_logging(self):
        """Налаштувати логування"""
        logs_dir = self.codemap_dir / "logs"
        logs_dir.mkdir(parents=True, exist_ok=True)
        
        log_file = logs_dir / "mcp_architecture_server.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stderr)
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def _initialize_architecture_tools(self) -> List[Dict[str, Any]]:
        """Ініціалізувати архітектурні інструменти"""
        return [
            {
                "name": "get_architecture_overview",
                "description": "Отримати огляд архітектури: активні файли, невикористовувані, здоров'я системи",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "analyze_file_status",
                "description": "Аналізувати статус конкретного файлу: залежності, залежні файли, здоров'я",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "detect_circular_dependencies",
                "description": "Виявити циклічні залежності в архітектурі",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "detect_unused_files",
                "description": "Виявити невикористовувані файли",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "detect_duplicates",
                "description": "Виявити дублікати коду",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "min_lines": {"type": "integer", "description": "Мінімальна довжина блоку (за замовчуванням 5)"}
                    }
                }
            },
            {
                "name": "detect_broken_files",
                "description": "Виявити файли з помилками (syntax error)",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_dependency_graph",
                "description": "Отримати граф залежностей для файлу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "file_path": {"type": "string", "description": "Шлях до файлу"},
                        "depth": {"type": "integer", "description": "Глибина графу"}
                    },
                    "required": ["file_path"]
                }
            },
            {
                "name": "get_architecture_health",
                "description": "Отримати оцінку здоров'я архітектури та рекомендації",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "get_refactoring_recommendations",
                "description": "Отримати рекомендації для рефакторингу на основі аналізу",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "priority": {"type": "string", "enum": ["low", "medium", "high"]}
                    }
                }
            },
            {
                "name": "export_architecture_report",
                "description": "Експортувати детальний звіт архітектури",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "format": {"type": "string", "enum": ["json", "html", "markdown"]}
                    }
                }
            }
        ]
    
    def _ensure_architecture_cached(self):
        """Переконатися, що архітектура проаналізована"""
        if self.architecture_cache is None:
            logger.info("🔍 Аналіз архітектури...")
            self.architecture_cache = self.mapper.analyze_architecture(max_depth=2)
            self.last_analysis_time = datetime.now()
            logger.info("✅ Архітектура проаналізована")
    
    def handle_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Обробити виклик інструменту"""
        try:
            if tool_name == "get_architecture_overview":
                return self._get_architecture_overview()
            elif tool_name == "analyze_file_status":
                file_path = arguments.get("file_path", "")
                return self._analyze_file_status(file_path)
            elif tool_name == "detect_circular_dependencies":
                return self._detect_circular_dependencies()
            elif tool_name == "detect_unused_files":
                return self._detect_unused_files()
            elif tool_name == "detect_duplicates":
                min_lines = arguments.get("min_lines", 5)
                return self._detect_duplicates(min_lines)
            elif tool_name == "detect_broken_files":
                return self._detect_broken_files()
            elif tool_name == "get_dependency_graph":
                file_path = arguments.get("file_path", "")
                depth = arguments.get("depth", 2)
                return self._get_dependency_graph(file_path, depth)
            elif tool_name == "get_architecture_health":
                return self._get_architecture_health()
            elif tool_name == "get_refactoring_recommendations":
                priority = arguments.get("priority", "medium")
                return self._get_refactoring_recommendations(priority)
            elif tool_name == "export_architecture_report":
                format_type = arguments.get("format", "json")
                return self._export_architecture_report(format_type)
            else:
                return json.dumps({"error": f"Unknown tool: {tool_name}"})
        except Exception as e:
            logger.error(f"❌ Помилка в {tool_name}: {e}", exc_info=True)
            return json.dumps({"error": str(e)})
    
    def _get_architecture_overview(self) -> str:
        """Отримати огляд архітектури"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        stats = self.architecture_cache.get("statistics", {})
        health = self.architecture_cache.get("health_score", {})
        cycles = self.architecture_cache.get("circular_dependencies", [])
        
        overview = {
            "timestamp": self.last_analysis_time.isoformat() if self.last_analysis_time else None,
            "statistics": stats,
            "health_score": health,
            "circular_dependencies_count": len(cycles),
            "summary": {
                "total_files": stats.get("total_files", 0),
                "active_files": stats.get("active_files", 0),
                "unused_files": stats.get("unused_files", 0),
                "deprecated_files": stats.get("deprecated_files", 0),
                "broken_files": stats.get("broken_files", 0),
            }
        }
        
        return json.dumps(overview, indent=2, ensure_ascii=False)
    
    def _analyze_file_status(self, file_path: str) -> str:
        """Аналізувати статус файлу"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        if file_path not in self.architecture_cache.get("files", {}):
            return json.dumps({"error": f"File not found: {file_path}"})
        
        file_info = self.architecture_cache["files"][file_path]
        
        status_info = {
            "file": file_path,
            "status": file_info.get("status"),
            "size": file_info.get("size"),
            "lines": file_info.get("lines"),
            "last_modified": file_info.get("last_modified"),
            "functions_count": file_info.get("functions_count"),
            "classes_count": file_info.get("classes_count"),
            "dependencies": self.architecture_cache.get("dependencies", {}).get(file_path, []),
            "dependents_count": file_info.get("dependents_count"),
        }
        
        return json.dumps(status_info, indent=2, ensure_ascii=False)
    
    def _detect_circular_dependencies(self) -> str:
        """Виявити циклічні залежності"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        cycles = self.architecture_cache.get("circular_dependencies", [])
        
        return json.dumps({
            "circular_dependencies": cycles,
            "count": len(cycles),
            "message": f"Знайдено {len(cycles)} циклічних залежностей"
        }, indent=2, ensure_ascii=False)
    
    def _detect_unused_files(self) -> str:
        """Виявити невикористовувані файли"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        unused = []
        for file_path, file_info in self.architecture_cache.get("files", {}).items():
            if file_info.get("status") == FileStatus.UNUSED:
                unused.append({
                    "file": file_path,
                    "size": file_info.get("size"),
                    "lines": file_info.get("lines")
                })
        
        return json.dumps({
            "unused_files": unused,
            "count": len(unused),
            "message": f"Знайдено {len(unused)} невикористовуваних файлів"
        }, indent=2, ensure_ascii=False)
    
    def _detect_duplicates(self, min_lines: int) -> str:
        """Виявити дублікати"""
        logger.info(f"🔍 Пошук дублікатів (min_lines={min_lines})...")
        
        try:
            duplicates = self.duplication_detector.find_duplicates(min_lines=min_lines)
            
            return json.dumps({
                "duplicates": duplicates[:10],  # Показуємо перші 10
                "count": len(duplicates),
                "message": f"Знайдено {len(duplicates)} дублікатів коду"
            }, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error(f"❌ Помилка при пошуку дублікатів: {e}")
            return json.dumps({"error": str(e)})
    
    def _detect_broken_files(self) -> str:
        """Виявити файли з помилками"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        broken = []
        for file_path, file_info in self.architecture_cache.get("files", {}).items():
            if file_info.get("status") == FileStatus.BROKEN or file_info.get("broken_reason"):
                broken.append({
                    "file": file_path,
                    "size": file_info.get("size"),
                    "lines": file_info.get("lines"),
                    "reason": file_info.get("broken_reason"),
                })
        
        return json.dumps({
            "broken_files": broken,
            "count": len(broken),
            "message": f"Знайдено {len(broken)} файлів з помилками",
        }, indent=2, ensure_ascii=False)
    
    def _get_dependency_graph(self, file_path: str, depth: int) -> str:
        """Отримати граф залежностей"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        if file_path not in self.architecture_cache.get("files", {}):
            return json.dumps({"error": f"File not found: {file_path}"})
        
        graph = {
            "root": file_path,
            "depth": depth,
            "nodes": {},
            "edges": []
        }
        
        # Будуємо граф рекурсивно
        self._build_graph_recursive(file_path, graph, depth, 0)
        
        return json.dumps(graph, indent=2, ensure_ascii=False)
    
    def _build_graph_recursive(self, file_path: str, graph: Dict, max_depth: int, current_depth: int):
        """Рекурсивно будувати граф"""
        if current_depth >= max_depth or file_path in graph["nodes"]:
            return
        
        if self.architecture_cache is None:
            return
        
        if file_path not in self.architecture_cache.get("files", {}):
            return
        
        file_info = self.architecture_cache["files"][file_path]
        graph["nodes"][file_path] = {
            "status": file_info.get("status"),
            "lines": file_info.get("lines"),
            "depth": current_depth
        }
        
        deps = self.architecture_cache.get("dependencies", {}).get(file_path, [])
        for dep in deps:
            graph["edges"].append({"from": file_path, "to": dep})
            self._build_graph_recursive(dep, graph, max_depth, current_depth + 1)
    
    def _get_architecture_health(self) -> str:
        """Отримати оцінку здоров'я архітектури"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        health = self.architecture_cache.get("health_score", {})
        
        return json.dumps({
            "health": health,
            "recommendations": self._generate_health_recommendations(health)
        }, indent=2, ensure_ascii=False)
    
    def _generate_health_recommendations(self, health: Dict) -> List[str]:
        """Генерувати рекомендації на основі здоров'я"""
        recommendations = []
        score = health.get("score", 0)
        
        if score < 50:
            recommendations.append("⚠️ КРИТИЧНО: Архітектура потребує серйозного рефакторингу")
        elif score < 70:
            recommendations.append("⚠️ Архітектура має проблеми, рекомендується покращення")
        else:
            recommendations.append("✅ Архітектура в хорошому стані")
        
        return recommendations
    
    def _get_refactoring_recommendations(self, priority: str) -> str:
        """Отримати рекомендації рефакторингу"""
        self._ensure_architecture_cached()
        
        if self.architecture_cache is None:
            return json.dumps({"error": "Architecture not analyzed yet"})
        
        recommendations = {
            "priority": priority,
            "items": []
        }
        
        # Аналізуємо архітектуру та генеруємо рекомендації
        for file_path, file_info in self.architecture_cache.get("files", {}).items():
            if file_info.get("status") == FileStatus.DEPRECATED:
                recommendations["items"].append({
                    "file": file_path,
                    "type": "deprecated",
                    "action": "Розглянути видалення або оновлення"
                })
            elif file_info.get("status") == FileStatus.UNUSED:
                recommendations["items"].append({
                    "file": file_path,
                    "type": "unused",
                    "action": "Розглянути видалення"
                })
        
        return json.dumps(recommendations, indent=2, ensure_ascii=False)
    
    def _export_architecture_report(self, format_type: str) -> str:
        """Експортувати звіт архітектури"""
        self._ensure_architecture_cached()
        
        report_path = self.reports_dir / f"architecture_report.{format_type}"
        
        if format_type == "json":
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(self.architecture_cache, f, indent=2, ensure_ascii=False, default=str)
        elif format_type == "markdown":
            md_content = self._generate_markdown_report()
            with open(report_path, 'w', encoding='utf-8') as f:
                f.write(md_content)
        
        return json.dumps({
            "success": True,
            "report_path": str(report_path),
            "format": format_type,
            "message": f"Звіт експортований в {report_path}"
        }, indent=2, ensure_ascii=False)
    
    def _generate_markdown_report(self) -> str:
        """Генерувати Markdown звіт"""
        if self.architecture_cache is None:
            return "# Architecture not analyzed"
        
        stats = self.architecture_cache.get("statistics", {})
        health = self.architecture_cache.get("health_score", {})
        cycles = self.architecture_cache.get("circular_dependencies", [])
        
        md = f"""# 🏗️ Architecture Report

## 📊 Statistics
- **Total Files**: {stats.get('total_files', 0)}
- **Active Files**: {stats.get('active_files', 0)}
- **Unused Files**: {stats.get('unused_files', 0)}
- **Deprecated Files**: {stats.get('deprecated_files', 0)}
- **Total Lines**: {stats.get('total_lines', 0)}

## 🏥 Health
- **Score**: {health.get('score', 0):.1f}/100
- **Modularity**: {health.get('modularity', 'unknown')}
- **Unused Ratio**: {health.get('unused_ratio', 0):.1%}

## 🔄 Circular Dependencies
- **Count**: {len(cycles)}
"""
        
        if cycles:
            md += "\n### Cycles Found:\n"
            for i, cycle in enumerate(cycles[:5], 1):
                md += f"{i}. {' → '.join(cycle)}\n"
        
        return md


def main():
    """Основна функція MCP сервера"""
    server = ArchitectureAnalysisServer()
    
    # Якщо stdin закритий або не TTY (запущено в фоні), просто чекаємо
    try:
        is_tty = sys.stdin.isatty()
    except (AttributeError, ValueError):
        is_tty = False
    
    if not is_tty:
        logger.info("📡 MCP сервер готовий до отримання команд (фоновий режим)")
        # Чекаємо на сигнали, але не читаємо stdin
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("🛑 MCP сервер зупинений")
            return
    
    # Читаємо JSON-RPC запити зі stdin
    for line in sys.stdin:
        try:
            request = json.loads(line)
            
            if request.get("method") == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {},
                        "serverInfo": {
                            "name": "architecture-analysis-server",
                            "version": "2.0.0"
                        }
                    }
                }
            elif request.get("method") == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "result": {
                        "tools": server.tools
                    }
                }
            elif request.get("method") == "tools/call":
                params = request.get("params", {})
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                
                result = server.handle_tool_call(tool_name, arguments)
                
                response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": result
                            }
                        ]
                    }
                }
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "error": {
                        "code": -32601,
                        "message": "Method not found"
                    }
                }
            
            print(json.dumps(response, ensure_ascii=False))
            sys.stdout.flush()
        
        except json.JSONDecodeError as e:
            error_response = {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32700,
                    "message": f"Parse error: {e}"
                }
            }
            print(json.dumps(error_response))
            sys.stdout.flush()
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {e}"
                }
            }
            print(json.dumps(error_response))
            sys.stdout.flush()


if __name__ == "__main__":
    main()
