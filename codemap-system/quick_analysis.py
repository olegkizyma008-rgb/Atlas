#!/usr/bin/env python3
"""
Швидкий аналіз архітектури без великих папок
"""

import json
import sys
from pathlib import Path
from datetime import datetime

def analyze_project():
    """Аналізує основну структуру проекту"""
    project_root = Path("/Users/dev/Documents/GitHub/atlas4")
    
    # Основні папки для аналізу (без великих директорій)
    core_dirs = [
        "config",
        "docs", 
        "reports",
        "data",
        "models"
    ]
    
    # Шукаємо файли тільки в основних папках
    files = []
    for dir_name in core_dirs:
        dir_path = project_root / dir_name
        if dir_path.exists():
            for ext in ['.js', '.ts', '.py', '.json']:
                files.extend(dir_path.rglob(f'*{ext}'))
    
    # Аналізуємо файли
    analysis = {
        "timestamp": datetime.now().isoformat(),
        "analyzed_directories": core_dirs,
        "total_files": len(files),
        "file_types": {},
        "directory_structure": {},
        "potential_issues": []
    }
    
    for file_path in files:
        # Підрахунок типів файлів
        ext = file_path.suffix
        analysis["file_types"][ext] = analysis["file_types"].get(ext, 0) + 1
        
        # Структура директорій
        dir_name = file_path.parent.name
        if dir_name not in analysis["directory_structure"]:
            analysis["directory_structure"][dir_name] = 0
        analysis["directory_structure"][dir_name] += 1
        
        # Перевірка на потенційні проблеми
        if file_path.stat().st_size > 100000:  # > 100KB
            analysis["potential_issues"].append({
                "type": "large_file",
                "file": str(file_path.relative_to(project_root)),
                "size": file_path.stat().st_size
            })
    
    # Додаємо огляд
    analysis["summary"] = {
        "total_files": len(files),
        "main_directories": len([d for d in core_dirs if (project_root / d).exists()]),
        "file_types": len(analysis["file_types"]),
        "issues_found": len(analysis["potential_issues"])
    }
    
    return analysis

if __name__ == "__main__":
    # Запускаємо аналіз
    result = analyze_project()
    
    # Виводимо результат
    print(json.dumps(result, indent=2, ensure_ascii=False))
