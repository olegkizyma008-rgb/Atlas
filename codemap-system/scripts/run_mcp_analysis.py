#!/usr/bin/env python3
"""
MCP Tools Analysis Script
Використовує 4 основних інструменти для глибокого аналізу проекту
"""

import json
import sys
from pathlib import Path

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "core"))

from mcp_advanced_tools import AdvancedMCPTools

def main():
    """Запускаємо аналіз з 4 основними інструментами"""
    
    print("\n" + "="*80)
    print("🔍 MCP TOOLS ANALYSIS - 4 ОСНОВНИХ ІНСТРУМЕНТИ")
    print("="*80 + "\n")
    
    # Ініціалізуємо інструменти
    project_root = Path(__file__).parent.parent.parent
    reports_dir = project_root / "codemap-system" / "reports"
    
    tools = AdvancedMCPTools(
        project_root=str(project_root),
        reports_dir=str(reports_dir)
    )
    
    # ========================================================================
    # ІНСТРУМЕНТ 1: analyze_file_deeply
    # ========================================================================
    print("📊 ІНСТРУМЕНТ 1: analyze_file_deeply")
    print("-" * 80)
    try:
        # Аналізуємо основний файл сервера
        result = tools.analyze_file_deeply("web/atlas_server.py")
        print(f"✅ File: {result.get('file', 'N/A')}")
        print(f"✅ Dead Functions: {result.get('dead_functions_count', 0)}")
        print(f"✅ Health Score: {result.get('health_score', 'N/A')}/10")
        if result.get('dead_functions'):
            print(f"✅ Dead Functions Found:")
            for func in result.get('dead_functions', [])[:5]:
                print(f"   - {func}")
        print()
    except Exception as e:
        print(f"❌ Помилка: {e}\n")
    
    # ========================================================================
    # ІНСТРУМЕНТ 2: find_duplicates_in_directory
    # ========================================================================
    print("🔄 ІНСТРУМЕНТ 2: find_duplicates_in_directory")
    print("-" * 80)
    try:
        # Шукаємо дублікати в JS компонентах
        result = tools.find_duplicates_in_directory("web/static/js/components/ui")
        print(f"✅ Directory: web/static/js/components/ui")
        print(f"✅ Duplicates Found: {result.get('duplicates_found', 0)}")
        print(f"✅ Exact Duplicates: {result.get('summary', {}).get('exact_duplicates', 0)}")
        print(f"✅ Semantic Duplicates: {result.get('summary', {}).get('semantic_duplicates', 0)}")
        if result.get('duplicates'):
            print(f"✅ Top Duplicates:")
            for i, dup in enumerate(result.get('duplicates', [])[:3], 1):
                print(f"   {i}. {dup.get('file1', 'N/A')} ↔ {dup.get('file2', 'N/A')}")
                print(f"      Type: {dup.get('type', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Помилка: {e}\n")
    
    # ========================================================================
    # ІНСТРУМЕНТ 3: generate_refactoring_plan
    # ========================================================================
    print("📋 ІНСТРУМЕНТ 3: generate_refactoring_plan")
    print("-" * 80)
    try:
        # Генеруємо план рефакторингу з високим пріоритетом
        result = tools.generate_refactoring_plan(priority="high")
        print(f"✅ Priority: high")
        print(f"✅ Items to Refactor: {result.get('items_count', 0)}")
        if result.get('items'):
            print(f"✅ Top Items:")
            for i, item in enumerate(result.get('items', [])[:3], 1):
                print(f"   {i}. {item.get('file', 'N/A')}")
                print(f"      Reason: {item.get('reason', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Помилка: {e}\n")
    
    # ========================================================================
    # ІНСТРУМЕНТ 4: analyze_impact
    # ========================================================================
    print("⚡ ІНСТРУМЕНТ 4: analyze_impact")
    print("-" * 80)
    try:
        # Аналізуємо вплив змін до основного файлу сервера
        result = tools.analyze_impact("web/atlas_server.py")
        print(f"✅ File: {result.get('file', 'N/A')}")
        print(f"✅ Direct Dependencies: {result.get('direct_dependencies', 0)}")
        print(f"✅ Direct Dependents: {result.get('direct_dependents', 0)}")
        print(f"✅ Cascade Depth: {result.get('cascade_depth', 0)}")
        print(f"✅ Risk Level: {result.get('risk_level', 'N/A')}")
        if result.get('recommendation'):
            print(f"✅ Recommendation: {result.get('recommendation', 'N/A')}")
        print()
    except Exception as e:
        print(f"❌ Помилка: {e}\n")
    
    # ========================================================================
    # ГЕНЕРУЄМО ЗВІТ
    # ========================================================================
    print("="*80)
    print("📊 ГЕНЕРУВАННЯ ДЕТАЛЬНОГО ЗВІТУ")
    print("="*80 + "\n")
    
    try:
        # Збираємо всі результати
        analysis_data = {
            "timestamp": str(Path(__file__).stat().st_mtime),
            "tool_1_file_analysis": tools.analyze_file_deeply("web/atlas_server.py"),
            "tool_2_duplicates": tools.find_duplicates_in_directory("web/static/js/components/ui"),
            "tool_3_refactoring_plan": tools.generate_refactoring_plan(priority="high"),
            "tool_4_impact_analysis": tools.analyze_impact("web/atlas_server.py"),
        }
        
        # Зберігаємо у JSON
        report_path = reports_dir / "mcp_tools_analysis.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Звіт збережено: {report_path}")
        print()
        
    except Exception as e:
        print(f"❌ Помилка при генеруванні звіту: {e}\n")
    
    # ========================================================================
    # ВИСНОВКИ
    # ========================================================================
    print("="*80)
    print("📋 ВИСНОВКИ")
    print("="*80 + "\n")
    print("✅ Аналіз завершено!")
    print("✅ Використано 4 основних інструменти:")
    print("   1. analyze_file_deeply - Глибокий аналіз файлу")
    print("   2. find_duplicates_in_directory - Пошук дублікатів коду")
    print("   3. generate_refactoring_plan - Генерація плану рефакторингу")
    print("   4. analyze_impact - Аналіз впливу змін")
    print("\n✅ Результати збережено у:")
    print("   - /codemap-system/reports/mcp_tools_analysis.json")
    print("\n" + "="*80 + "\n")

if __name__ == "__main__":
    main()
