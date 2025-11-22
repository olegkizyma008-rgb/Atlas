#!/usr/bin/env python3
"""
Windsurf Commands - Команди для Windsurf IDE
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from windsurf.mcp_architecture_server import ArchitectureAnalysisServer


class WindsurfCommands:
    """Команди для Windsurf IDE"""
    
    def __init__(self):
        self.server = ArchitectureAnalysisServer()
    
    def analyze(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture analyze
        Аналізувати архітектуру проекту
        """
        result = self.server.handle_tool_call("get_architecture_overview", {})
        return self._format_result("Аналіз архітектури", result)
    
    def dependencies(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture dependencies [file]
        Показати залежності файлу
        """
        if not args or len(args) == 0:
            return "❌ Потрібно вказати файл: /architecture dependencies <file>"
        
        file_path = args[0]
        result = self.server.handle_tool_call("get_dependency_graph", {
            "file_path": file_path,
            "depth": 2
        })
        return self._format_result(f"Залежності для {file_path}", result)
    
    def unused(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture unused
        Знайти невикористовувані файли
        """
        result = self.server.handle_tool_call("detect_unused_files", {})
        return self._format_result("Невикористовувані файли", result)
    
    def broken(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture broken
        Знайти файли з помилками (syntax error)
        """
        result = self.server.handle_tool_call("detect_broken_files", {})
        return self._format_result("Пошкоджені файли", result)
    
    def circular(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture circular
        Знайти циклічні залежності
        """
        result = self.server.handle_tool_call("detect_circular_dependencies", {})
        return self._format_result("Циклічні залежності", result)
    
    def duplicates(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture duplicates
        Знайти дублікати коду
        """
        min_lines = 5
        if args and len(args) > 0:
            try:
                min_lines = int(args[0])
            except ValueError:
                pass
        
        result = self.server.handle_tool_call("detect_duplicates", {
            "min_lines": min_lines
        })
        return self._format_result("Дублікати коду", result)
    
    def refactor(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture refactor [priority]
        Отримати рекомендації рефакторингу
        """
        priority = "medium"
        if args and len(args) > 0:
            priority = args[0]
        
        result = self.server.handle_tool_call("get_refactoring_recommendations", {
            "priority": priority
        })
        return self._format_result("Рекомендації рефакторингу", result)
    
    def health(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture health
        Оцінка здоров'я архітектури
        """
        result = self.server.handle_tool_call("get_architecture_health", {})
        return self._format_result("Здоров'я архітектури", result)
    
    def report(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture report [format]
        Експортувати звіт архітектури
        """
        format_type = "json"
        if args and len(args) > 0:
            format_type = args[0]
        
        result = self.server.handle_tool_call("export_architecture_report", {
            "format": format_type
        })
        return self._format_result(f"Експорт звіту ({format_type})", result)
    
    def status(self, args: Optional[List[str]] = None) -> str:
        """
        /architecture status [file]
        Отримати статус файлу
        """
        if not args or len(args) == 0:
            return "❌ Потрібно вказати файл: /architecture status <file>"
        
        file_path = args[0]
        result = self.server.handle_tool_call("analyze_file_status", {
            "file_path": file_path
        })
        return self._format_result(f"Статус файлу {file_path}", result)
    
    def _format_result(self, title: str, result: str) -> str:
        """Форматувати результат для Windsurf"""
        try:
            data = json.loads(result)
            
            # Форматуємо як Markdown для Windsurf
            output = f"# 🏗️ {title}\n\n"
            output += "```json\n"
            output += json.dumps(data, indent=2, ensure_ascii=False)
            output += "\n```\n"
            
            return output
        except:
            return f"# 🏗️ {title}\n\n{result}"
    
    def get_help(self) -> str:
        """Отримати довідку по командам"""
        help_text = """
# 🏗️ Architecture Commands

## Доступні команди:

### `/architecture analyze`
Аналізувати архітектуру проекту. Показує статистику, здоров'я, циклічні залежності.

### `/architecture dependencies <file>`
Показати залежності конкретного файлу та граф залежностей.

### `/architecture unused`
Знайти невикористовувані файли в проекті.

### `/architecture broken`
Знайти файли, які мають помилки синтаксису і можуть ламати аналіз.

### `/architecture circular`
Знайти циклічні залежності в архітектурі.

### `/architecture duplicates [min_lines]`
Знайти дублікати коду. Опціонально вказати мінімальну довжину блоку (за замовчуванням 5).

### `/architecture refactor [priority]`
Отримати рекомендації рефакторингу. Пріоритет: low, medium, high.

### `/architecture health`
Отримати оцінку здоров'я архітектури та рекомендації.

### `/architecture report [format]`
Експортувати звіт архітектури. Формати: json, html, markdown.

### `/architecture status <file>`
Отримати детальний статус конкретного файлу.

## Приклади:

```
/architecture analyze
/architecture dependencies src/main.js
/architecture unused
/architecture circular
/architecture duplicates 10
/architecture refactor high
/architecture health
/architecture report markdown
/architecture status src/app.py
/architecture broken
```
"""
        return help_text


def main():
    """Основна функція для тестування"""
    commands = WindsurfCommands()
    
    print("🏗️ Windsurf Architecture Commands")
    print("=" * 50)
    print(commands.get_help())


if __name__ == "__main__":
    main()
