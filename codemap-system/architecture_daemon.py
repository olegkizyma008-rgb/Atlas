#!/usr/bin/env python3
"""
Architecture Daemon - Постійний моніторинг архітектури
Працює у фоні, аналізує зміни, дає рекомендації розробнику
"""

import time
import logging
from pathlib import Path
from datetime import datetime
from core.architecture_mapper import ArchitectureMapper
from core.code_duplication_detector import CodeDuplicationDetector
from core.code_quality_analyzer import CodeQualityAnalyzer

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/architecture_daemon.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ArchitectureDaemon:
    """Daemon для постійного моніторингу архітектури"""
    
    def __init__(self, check_interval: int = 300):
        """
        Ініціалізувати daemon
        
        Args:
            check_interval: Інтервал перевірки в секундах (за замовчуванням 5 хвилин)
        """
        self.check_interval = check_interval
        self.mapper = ArchitectureMapper()
        self.last_analysis = None
        self.last_architecture = None
        
        logger.info(f"🚀 Architecture Daemon запущений (інтервал: {check_interval}с)")
    
    def run(self):
        """Запустити daemon"""
        logger.info("📊 Daemon почав роботу")
        
        try:
            while True:
                try:
                    self._check_architecture()
                    time.sleep(self.check_interval)
                except KeyboardInterrupt:
                    logger.info("⏹️  Daemon зупинений користувачем")
                    break
                except Exception as e:
                    logger.error(f"❌ Помилка в daemon: {e}", exc_info=True)
                    time.sleep(self.check_interval)
        
        except Exception as e:
            logger.error(f"❌ Критична помилка: {e}", exc_info=True)
    
    def _check_architecture(self):
        """Перевірити архітектуру"""
        logger.info("🔍 Аналіз архітектури...")
        
        try:
            # Аналізуємо архітектуру
            architecture = self.mapper.analyze_architecture(max_depth=2)
            
            # Якщо це перший аналіз
            if self.last_architecture is None:
                self._report_initial_analysis(architecture)
            else:
                # Порівнюємо зі старим аналізом
                self._report_changes(self.last_architecture, architecture)
            
            self.last_architecture = architecture
            self.last_analysis = datetime.now()
            
            logger.info("✅ Аналіз завершено")
        
        except Exception as e:
            logger.error(f"❌ Помилка аналізу: {e}", exc_info=True)
    
    def _report_initial_analysis(self, architecture):
        """Звітувати про перший аналіз"""
        stats = architecture['statistics']
        health = architecture['health_score']
        cycles = architecture['circular_dependencies']
        
        logger.info(f"""
╔════════════════════════════════════════════════════════════════╗
║           ПЕРШИЙ АНАЛІЗ АРХІТЕКТУРИ                           ║
╚════════════════════════════════════════════════════════════════╝

📊 СТАТИСТИКА:
   • Всього файлів: {stats['total_files']}
   • Активних файлів: {stats['active_files']}
   • Невикористовуваних файлів: {stats['unused_files']}
   • Застарілих файлів: {stats['deprecated_files']}
   • Всього рядків: {stats['total_lines']}

🏥 ЗДОРОВ'Я: {health['score']:.1f}/100
   • Модульність: {health['modularity']}
   • Невикористання: {health['unused_ratio']:.1%}

🔄 ЦИКЛІЧНІ ЗАЛЕЖНОСТІ: {len(cycles)}
""")
        
        if cycles:
            for i, cycle in enumerate(cycles[:3], 1):
                logger.warning(f"   ⚠️  Цикл {i}: {' → '.join(cycle)}")
    
    def _report_changes(self, old_arch, new_arch):
        """Звітувати про зміни"""
        old_stats = old_arch['statistics']
        new_stats = new_arch['statistics']
        
        # Перевіряємо зміни
        changes = []
        
        if new_stats['total_files'] != old_stats['total_files']:
            diff = new_stats['total_files'] - old_stats['total_files']
            changes.append(f"📁 Файлів: {old_stats['total_files']} → {new_stats['total_files']} ({diff:+d})")
        
        if new_stats['unused_files'] != old_stats['unused_files']:
            diff = new_stats['unused_files'] - old_stats['unused_files']
            changes.append(f"🗑️  Невикористовувані: {old_stats['unused_files']} → {new_stats['unused_files']} ({diff:+d})")
        
        if new_arch['circular_dependencies'] != old_arch['circular_dependencies']:
            old_cycles = len(old_arch['circular_dependencies'])
            new_cycles = len(new_arch['circular_dependencies'])
            diff = new_cycles - old_cycles
            changes.append(f"🔄 Циклічні залежності: {old_cycles} → {new_cycles} ({diff:+d})")
        
        if changes:
            logger.info(f"""
╔════════════════════════════════════════════════════════════════╗
║           ЗМІНИ В АРХІТЕКТУРІ                                  ║
╚════════════════════════════════════════════════════════════════╝
""")
            for change in changes:
                logger.info(f"   {change}")
        else:
            logger.info("✅ Архітектура без змін")


def main():
    """Запустити daemon"""
    # Створюємо папку для логів
    Path('logs').mkdir(exist_ok=True)
    
    # Запускаємо daemon з інтервалом 5 хвилин
    daemon = ArchitectureDaemon(check_interval=300)
    daemon.run()


if __name__ == '__main__':
    main()
