#!/usr/bin/env python3
"""
Оптимізація великих звітів
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

def optimize_large_reports():
    """Оптимізує великі звіти"""
    docs_dir = Path("/Users/dev/Documents/GitHub/atlas4/docs/codemap")
    archive_dir = docs_dir / "archive"
    archive_dir.mkdir(exist_ok=True)
    
    large_json = docs_dir / "codemap_analysis.json"
    
    if large_json.exists():
        size = large_json.stat().st_size
        print(f"Розмір файлу: {size / 1024 / 1024:.2f} MB")
        
        if size > 10 * 1024 * 1024:  # > 10MB
            # Архівуємо великий файл
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            archived_name = f"codemap_analysis_{timestamp}.json"
            archived_path = archive_dir / archived_name
            
            # Переміщуємо в архів
            shutil.move(str(large_json), str(archived_path))
            print(f"✅ Великий звіт заархівовано: {archived_name}")
            
            # Створюємо короткий звіт-заміну
            summary = {
                "timestamp": datetime.now().isoformat(),
                "original_report_archived": str(archived_name),
                "original_size_mb": size / 1024 / 1024,
                "message": "Повний звіт заархівовано через великий розмір. Використовуйте архів для детального аналізу."
            }
            
            with open(large_json, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            print("✅ Створено короткий звіт-заміну")

def clean_test_files():
    """Очищує та організовує тести"""
    project_root = Path("/Users/dev/Documents/GitHub/atlas4")
    
    # Створюємо централізовану папку для тестів
    central_tests = project_root / "tests"
    central_tests.mkdir(exist_ok=True)
    
    # Шукаємо розпорошені тести
    test_patterns = [
        "test-*.js",
        "*-test.js", 
        "*.test.js",
        "test_*.py"
    ]
    
    moved_count = 0
    for pattern in test_patterns:
        for test_file in project_root.rglob(pattern):
            # Пропускаємо правильні папки
            if "tests" in str(test_file.parent):
                continue
            # Пропускаємо великі папки
            if any(exclude in str(test_file) for exclude in ['node_modules', 'venv', '__pycache__', '.git']):
                continue
            
            # Створюємо таку саму структуру в tests
            relative_path = test_file.relative_to(project_root)
            new_path = central_tests / relative_path
            new_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Переміщуємо файл
            shutil.move(str(test_file), str(new_path))
            moved_count += 1
            print(f"Переміщено тест: {relative_path}")
    
    print(f"✅ Переміщено {moved_count} тестів в централізовану папку")

def optimize_node_modules():
    """Оптимізує node_modules від дублікатів"""
    project_root = Path("/Users/dev/Documents/GitHub/atlas4")
    package_json = project_root / "package.json"
    
    if package_json.exists():
        print("📦 Аналіз package.json для оптимізації...")
        with open(package_json) as f:
            data = json.load(f)
        
        # Перевіряємо на дублікати в залежностях
        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})
        
        duplicates = set(deps.keys()) & set(dev_deps.keys())
        if duplicates:
            print(f"⚠️ Знайдено дублікати залежностей: {duplicates}")
            print("💡 Рекомендація: Перевірте package.json та видаліть дублікати")

if __name__ == "__main__":
    print("🚀 Оптимізація інфраструктури Atlas4...")
    print()
    
    print("1️⃣ Оптимізація звітів...")
    optimize_large_reports()
    print()
    
    print("2️⃣ Очищення тестів...")
    clean_test_files()
    print()
    
    print("3️⃣ Аналіз залежностей...")
    optimize_node_modules()
    print()
    
    print("✅ Оптимізація завершена!")
