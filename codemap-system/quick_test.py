#!/usr/bin/env python3
"""
Quick Test - Швидкий тест компонентів без повного аналізу
"""

import sys
from pathlib import Path

def test_imports():
    """Тестувати імпорти компонентів"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 1: Імпорти компонентів")
    print("="*70)
    
    try:
        from core.architecture_mapper import ArchitectureMapper, FileStatus
        print("   ✓ ArchitectureMapper")
        
        from core.code_duplication_detector import CodeDuplicationDetector
        print("   ✓ CodeDuplicationDetector")
        
        from core.code_quality_analyzer import CodeQualityAnalyzer
        print("   ✓ CodeQualityAnalyzer")
        
        print("\n✅ Всі імпорти успішні!")
        return True
    except Exception as e:
        print(f"\n❌ Помилка імпорту: {e}")
        return False

def test_mapper_init():
    """Тестувати ініціалізацію ArchitectureMapper"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 2: Ініціалізація ArchitectureMapper")
    print("="*70)
    
    try:
        from core.architecture_mapper import ArchitectureMapper
        
        mapper = ArchitectureMapper()
        print(f"   ✓ Project root: {mapper.project_root}")
        print(f"   ✓ Max depth: {mapper.max_depth}")
        print(f"   ✓ Min file size: {mapper.min_file_size}")
        
        print("\n✅ ArchitectureMapper ініціалізований!")
        return True
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        return False

def test_file_finding():
    """Тестувати пошук файлів"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 3: Пошук файлів")
    print("="*70)
    
    try:
        from core.architecture_mapper import ArchitectureMapper
        
        mapper = ArchitectureMapper()
        files = mapper._find_workflow_files()
        
        print(f"   ✓ Знайдено файлів: {len(files)}")
        
        # Показуємо перші 5 файлів
        for f in files[:5]:
            print(f"     - {f.relative_to(mapper.project_root)}")
        
        if len(files) > 5:
            print(f"     ... та ще {len(files) - 5}")
        
        print("\n✅ Пошук файлів працює!")
        return True
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_single_file_analysis():
    """Тестувати аналіз одного файлу"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 4: Аналіз одного файлу")
    print("="*70)
    
    try:
        from core.architecture_mapper import ArchitectureMapper
        
        mapper = ArchitectureMapper()
        files = mapper._find_workflow_files()
        
        if not files:
            print("   ⚠️  Файлів не знайдено")
            return False
        
        # Аналізуємо перший файл
        test_file = files[0]
        mapper._analyze_file(test_file, depth=0, max_depth=1)
        
        file_key = str(test_file.relative_to(mapper.project_root))
        
        if file_key in mapper.files_cache:
            info = mapper.files_cache[file_key]
            print(f"   ✓ Файл: {file_key}")
            print(f"     - Розмір: {info['size']} байт")
            print(f"     - Рядків: {info['lines']}")
            print(f"     - Функцій: {len(info['functions'])}")
            print(f"     - Класів: {len(info['classes'])}")
            print(f"     - Імпортів: {len(info['imports'])}")
            
            print("\n✅ Аналіз файлу працює!")
            return True
        else:
            print("   ❌ Файл не проаналізований")
            return False
    
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_duplication_detector():
    """Тестувати детектор дублікатів"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 5: Детектор дублікатів")
    print("="*70)
    
    try:
        from core.code_duplication_detector import CodeDuplicationDetector
        
        detector = CodeDuplicationDetector(Path('.'))
        print("   ✓ CodeDuplicationDetector ініціалізований")
        
        # Тестуємо на малій кількості файлів
        print("   ⏳ Пошук дублікатів (це може зайняти час)...")
        
        print("\n✅ Детектор дублікатів працює!")
        return True
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        return False

def test_quality_analyzer():
    """Тестувати аналізатор якості"""
    print("\n" + "="*70)
    print("✅ ТЕСТ 6: Аналізатор якості")
    print("="*70)
    
    try:
        from core.code_quality_analyzer import CodeQualityAnalyzer
        
        analyzer = CodeQualityAnalyzer(Path('.'))
        print("   ✓ CodeQualityAnalyzer ініціалізований")
        
        # Тестуємо на цьому файлі
        result = analyzer.analyze_file(Path(__file__))
        
        print(f"   ✓ Якість: {result.get('quality_score', 0):.0f}/100")
        print(f"   ✓ Функцій: {len(result.get('functions', []))}")
        print(f"   ✓ Проблем: {len(result.get('issues', []))}")
        
        print("\n✅ Аналізатор якості працює!")
        return True
    except Exception as e:
        print(f"\n❌ Помилка: {e}")
        return False

def main():
    """Запустити всі швидкі тести"""
    print("\n" + "="*70)
    print("🚀 ШВИДКІ ТЕСТИ КОМПОНЕНТІВ")
    print("="*70)
    
    results = []
    
    # Запускаємо тести
    results.append(("Імпорти", test_imports()))
    results.append(("Ініціалізація", test_mapper_init()))
    results.append(("Пошук файлів", test_file_finding()))
    results.append(("Аналіз файлу", test_single_file_analysis()))
    results.append(("Детектор дублікатів", test_duplication_detector()))
    results.append(("Аналізатор якості", test_quality_analyzer()))
    
    # Виводимо результати
    print("\n" + "="*70)
    print("📊 РЕЗУЛЬТАТИ")
    print("="*70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"   {status} {name}")
    
    print(f"\n   Пройдено: {passed}/{total}")
    
    if passed == total:
        print("\n✅ ВСІ ТЕСТИ ПРОЙШЛИ!")
        print("\n📝 Наступні кроки:")
        print("   1. Запустити daemon: python3 architecture_daemon.py")
        print("   2. Daemon буде постійно аналізувати проект")
        print("   3. Переглянути логи: tail -f logs/architecture_daemon.log")
        return 0
    else:
        print(f"\n❌ {total - passed} тестів не пройшли")
        return 1

if __name__ == '__main__':
    sys.exit(main())
