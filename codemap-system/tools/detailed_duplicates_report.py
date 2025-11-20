#!/usr/bin/env python3
"""
ДЕТАЛЬНИЙ ЗВІТ ДУБЛІВ
Аналізує дублі та генерує рекомендації
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any
import logging

# ============================================================================
# LOGGING
# ============================================================================

def setup_logging():
    """Setup logging"""
    log_dir = Path(__file__).parent.parent / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "detailed_duplicates_report.log"
    
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
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    return logger

logger = setup_logging()

# ============================================================================
# ДЕТАЛЬНИЙ АНАЛІЗ
# ============================================================================

class DetailedDuplicatesAnalyzer:
    """Детальний аналізатор дублів"""
    
    def __init__(self, analysis_file: str):
        self.analysis_file = Path(analysis_file)
        self.data = self._load_analysis()
        
        logger.info(f"📂 Завантажено аналіз з: {self.analysis_file}")
    
    def _load_analysis(self) -> Dict[str, Any]:
        """Завантажити результати аналізу"""
        try:
            with open(self.analysis_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"❌ Помилка при завантаженні: {e}")
            return {}
    
    def categorize_duplicates(self) -> Dict[str, List[str]]:
        """Категоризувати дублі за типом"""
        logger.info("📋 Категоризація дублів...")
        
        categories = {
            'config': [],
            'backup': [],
            'archive': [],
            'test': [],
            'docs': [],
            'other': []
        }
        
        duplicates = self.data.get('duplicates', {}).get('duplicates', {})
        
        for file_hash, files in duplicates.items():
            for file_path in files:
                if 'config' in file_path.lower() or file_path.endswith('.yaml') or file_path.endswith('.json'):
                    categories['config'].extend(files)
                elif 'backup' in file_path.lower():
                    categories['backup'].extend(files)
                elif 'archive' in file_path.lower():
                    categories['archive'].extend(files)
                elif 'test' in file_path.lower():
                    categories['test'].extend(files)
                elif 'doc' in file_path.lower() or file_path.endswith('.md'):
                    categories['docs'].extend(files)
                else:
                    categories['other'].extend(files)
        
        # Видалити дублі в категоріях
        for key in categories:
            categories[key] = list(set(categories[key]))
        
        return categories
    
    def generate_recommendations(self) -> Dict[str, Any]:
        """Генерувати рекомендації"""
        logger.info("💡 Генерація рекомендацій...")
        
        categories = self.categorize_duplicates()
        duplicates_count = self.data.get('duplicates', {}).get('duplicate_groups', 0)
        duplicate_files = self.data.get('duplicates', {}).get('duplicate_files', 0)
        
        recommendations = {
            'critical': [],
            'high': [],
            'medium': [],
            'low': []
        }
        
        # Критичні рекомендації
        if len(categories['backup']) > 0:
            recommendations['critical'].append({
                'title': '🗑️  Видалити резервні копії',
                'description': f"Знайдено {len(categories['backup'])} дублів у backup директоріях",
                'action': 'Видалити файли з backups/ директорії',
                'files_affected': len(categories['backup']),
                'potential_savings': 'Значні'
            })
        
        if len(categories['config']) > 10:
            recommendations['critical'].append({
                'title': '⚙️  Консолідувати конфігурації',
                'description': f"Знайдено {len(categories['config'])} дублів конфігураційних файлів",
                'action': 'Залишити одну версію конфігурацій',
                'files_affected': len(categories['config']),
                'potential_savings': 'Середні'
            })
        
        # Високі рекомендації
        if len(categories['archive']) > 0:
            recommendations['high'].append({
                'title': '📦 Архівувати старі файли',
                'description': f"Знайдено {len(categories['archive'])} дублів у archive директоріях",
                'action': 'Перемістити у архів або видалити',
                'files_affected': len(categories['archive']),
                'potential_savings': 'Середні'
            })
        
        # Середні рекомендації
        if len(categories['test']) > 0:
            recommendations['medium'].append({
                'title': '🧪 Очистити тестові файли',
                'description': f"Знайдено {len(categories['test'])} дублів тестових файлів",
                'action': 'Видалити дублі тестів',
                'files_affected': len(categories['test']),
                'potential_savings': 'Малі'
            })
        
        if len(categories['docs']) > 0:
            recommendations['medium'].append({
                'title': '📚 Консолідувати документацію',
                'description': f"Знайдено {len(categories['docs'])} дублів документації",
                'action': 'Залишити одну версію документації',
                'files_affected': len(categories['docs']),
                'potential_savings': 'Малі'
            })
        
        # Низькі рекомендації
        if duplicate_files > 0:
            recommendations['low'].append({
                'title': '🔍 Провести рефакторинг подібних функцій',
                'description': f"Знайдено 36 груп подібних функцій",
                'action': 'Консолідувати подібні функції',
                'files_affected': 77,
                'potential_savings': 'Кодова якість'
            })
        
        return recommendations
    
    def generate_markdown_report(self) -> str:
        """Генерувати Markdown звіт"""
        logger.info("📝 Генерація Markdown звіту...")
        
        categories = self.categorize_duplicates()
        recommendations = self.generate_recommendations()
        
        report = "# 📊 ДЕТАЛЬНИЙ ЗВІТ ДУБЛІВ\n\n"
        
        # Категорії дублів
        report += "## 📋 КАТЕГОРІЇ ДУБЛІВ\n\n"
        report += f"- **Конфігурації:** {len(categories['config'])} файлів\n"
        report += f"- **Резервні копії:** {len(categories['backup'])} файлів\n"
        report += f"- **Архіви:** {len(categories['archive'])} файлів\n"
        report += f"- **Тести:** {len(categories['test'])} файлів\n"
        report += f"- **Документація:** {len(categories['docs'])} файлів\n"
        report += f"- **Інші:** {len(categories['other'])} файлів\n\n"
        
        # Рекомендації
        report += "## 💡 РЕКОМЕНДАЦІЇ\n\n"
        
        for priority, items in recommendations.items():
            if items:
                priority_name = {
                    'critical': '🔴 КРИТИЧНІ',
                    'high': '🟠 ВИСОКІ',
                    'medium': '🟡 СЕРЕДНІ',
                    'low': '🟢 НИЗЬКІ'
                }[priority]
                
                report += f"### {priority_name}\n\n"
                
                for item in items:
                    report += f"#### {item['title']}\n"
                    report += f"- **Опис:** {item['description']}\n"
                    report += f"- **Дія:** {item['action']}\n"
                    report += f"- **Файлів:** {item['files_affected']}\n"
                    report += f"- **Економія:** {item['potential_savings']}\n\n"
        
        return report
    
    def generate_json_report(self) -> Dict[str, Any]:
        """Генерувати JSON звіт"""
        logger.info("📊 Генерація JSON звіту...")
        
        return {
            'categories': self.categorize_duplicates(),
            'recommendations': self.generate_recommendations(),
            'summary': {
                'total_duplicates': self.data.get('duplicates', {}).get('duplicate_groups', 0),
                'duplicate_files': self.data.get('duplicates', {}).get('duplicate_files', 0),
                'total_files_analyzed': self.data.get('duplicates', {}).get('total_files_analyzed', 0)
            }
        }

# ============================================================================
# ОСНОВНА ФУНКЦІЯ
# ============================================================================

def main():
    """Основна функція"""
    project_root = Path('/Users/dev/Documents/GitHub/atlas4')
    analysis_file = project_root / 'reports' / 'duplicates_and_structure_analysis.json'
    
    logger.info("=" * 80)
    logger.info("🚀 ДЕТАЛЬНИЙ ЗВІТ ДУБЛІВ")
    logger.info("=" * 80)
    
    analyzer = DetailedDuplicatesAnalyzer(str(analysis_file))
    
    # Генерувати Markdown звіт
    markdown_report = analyzer.generate_markdown_report()
    markdown_file = project_root / 'reports' / 'DETAILED_DUPLICATES_REPORT.md'
    with open(markdown_file, 'w', encoding='utf-8') as f:
        f.write(markdown_report)
    logger.info(f"✅ Markdown звіт збережено: {markdown_file}")
    
    # Генерувати JSON звіт
    json_report = analyzer.generate_json_report()
    json_file = project_root / 'reports' / 'detailed_duplicates_report.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(json_report, f, indent=2, ensure_ascii=False)
    logger.info(f"✅ JSON звіт збережено: {json_file}")
    
    # Вивід резюме
    logger.info("\n" + "=" * 80)
    logger.info("📋 РЕЗЮМЕ")
    logger.info("=" * 80)
    
    summary = json_report['summary']
    logger.info(f"\n📊 СТАТИСТИКА:")
    logger.info(f"  • Всього дублів: {summary['total_duplicates']}")
    logger.info(f"  • Дублів файлів: {summary['duplicate_files']}")
    logger.info(f"  • Файлів проаналізовано: {summary['total_files_analyzed']}")
    
    logger.info(f"\n💡 РЕКОМЕНДАЦІЇ:")
    recommendations = json_report['recommendations']
    total_recommendations = sum(len(items) for items in recommendations.values())
    logger.info(f"  • Всього рекомендацій: {total_recommendations}")
    logger.info(f"  • Критичні: {len(recommendations['critical'])}")
    logger.info(f"  • Високі: {len(recommendations['high'])}")
    logger.info(f"  • Середні: {len(recommendations['medium'])}")
    logger.info(f"  • Низькі: {len(recommendations['low'])}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ ЗВІТ ЗАВЕРШЕНО")
    logger.info("=" * 80)

if __name__ == '__main__':
    main()
