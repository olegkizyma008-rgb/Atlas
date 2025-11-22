#!/usr/bin/env python3
"""
Test Phase 1 - Тестування ядра архітектурного аналізу
"""

import sys
from pathlib import Path
from core.architecture_mapper import ArchitectureMapper
from core.code_duplication_detector import CodeDuplicationDetector
from core.code_quality_analyzer import CodeQualityAnalyzer

def test_architecture_mapper():
    """Тестувати ArchitectureMapper"""
    print("\n" + "="*70)
    print("🔍 ТЕСТУВАННЯ: ArchitectureMapper")
    print("="*70)
    
    mapper = ArchitectureMapper()
    # Для тесту використовуємо меншу глибину
    architecture = mapper.analyze_architecture(max_depth=2)
    
    stats = architecture['statistics']
    health = architecture['health_score']
    cycles = architecture['circular_dependencies']
    
    print(f"\n📊 СТАТИСТИКА:")
    print(f"   • Всього файлів: {stats['total_files']}")
    print(f"   • Активних файлів: {stats['active_files']}")
    print(f"   • Невикористовуваних файлів: {stats['unused_files']}")
    print(f"   • Застарілих файлів: {stats['deprecated_files']}")
    print(f"   • Всього рядків: {stats['total_lines']}")
    
    print(f"\n🏥 ЗДОРОВ'Я:")
    print(f"   • Оцінка: {health['score']:.1f}/100")
    print(f"   • Модульність: {health['modularity']}")
    print(f"   • Невикористання: {health['unused_ratio']:.1%}")
    
    print(f"\n🔄 ЦИКЛІЧНІ ЗАЛЕЖНОСТІ:")
    print(f"   • Знайдено: {len(cycles)}")
    if cycles:
        for i, cycle in enumerate(cycles[:3], 1):
            print(f"   {i}. {' → '.join(cycle)}")
        if len(cycles) > 3:
            print(f"   ... та ще {len(cycles) - 3}")
    
    print(f"\n✅ ArchitectureMapper: OK")
    return True

def test_code_duplication_detector():
    """Тестувати CodeDuplicationDetector"""
    print("\n" + "="*70)
    print("📋 ТЕСТУВАННЯ: CodeDuplicationDetector")
    print("="*70)
    
    detector = CodeDuplicationDetector(Path('.'))
    duplicates = detector.find_duplicates(min_lines=5)
    
    print(f"\n📋 ДУБЛІКАТИ:")
    print(f"   • Знайдено: {len(duplicates)}")
    if duplicates:
        for i, dup in enumerate(duplicates[:3], 1):
            print(f"   {i}. {dup['count']} файлів: {dup['files'][:2]}")
        if len(duplicates) > 3:
            print(f"   ... та ще {len(duplicates) - 3}")
    
    print(f"\n✅ CodeDuplicationDetector: OK")
    return True

def test_code_quality_analyzer():
    """Тестувати CodeQualityAnalyzer"""
    print("\n" + "="*70)
    print("⭐ ТЕСТУВАННЯ: CodeQualityAnalyzer")
    print("="*70)
    
    analyzer = CodeQualityAnalyzer(Path('.'))
    
    # Тестуємо на деяких файлах
    test_files = list(Path('.').rglob('*.py'))[:3]
    
    print(f"\n⭐ ЯКІСТЬ КОДУ:")
    print(f"   • Проаналізовано файлів: {len(test_files)}")
    
    total_score = 0
    total_issues = 0
    
    for file_path in test_files:
        result = analyzer.analyze_file(file_path)
        if result:
            total_score += result['quality_score']
            total_issues += len(result['issues'])
            print(f"   • {file_path.name}: {result['quality_score']:.0f}/100")
    
    if test_files:
        avg_score = total_score / len(test_files)
        print(f"\n   • Середня оцінка: {avg_score:.1f}/100")
        print(f"   • Всього проблем: {total_issues}")
    
    print(f"\n✅ CodeQualityAnalyzer: OK")
    return True

def main():
    """Запустити всі тести"""
    print("\n" + "="*70)
    print("🚀 ФАЗА 1: ТЕСТУВАННЯ ЯДРА")
    print("="*70)
    
    try:
        # Тестуємо ArchitectureMapper
        test_architecture_mapper()
        
        # Тестуємо CodeDuplicationDetector
        test_code_duplication_detector()
        
        # Тестуємо CodeQualityAnalyzer
        test_code_quality_analyzer()
        
        print("\n" + "="*70)
        print("✅ ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!")
        print("="*70)
        print("\n📝 Наступні кроки:")
        print("   1. Переглянути результати")
        print("   2. Запустити: python3 test_phase1.py")
        print("   3. Перейти до Фази 2 (Windsurf інтеграція)")
        print("\n")
        
        return 0
    
    except Exception as e:
        print(f"\n❌ ПОМИЛКА: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == '__main__':
    sys.exit(main())
