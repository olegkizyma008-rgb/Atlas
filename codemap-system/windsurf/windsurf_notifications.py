#!/usr/bin/env python3
"""
Windsurf Notifications - Система сповіщень для IDE
"""

import json
from typing import Dict, List, Any, Optional
from enum import Enum
from datetime import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class NotificationType(Enum):
    """Типи сповіщень"""
    CIRCULAR_DEPENDENCY = "circular_dependency"
    UNUSED_FILE = "unused_file"
    DEPRECATED_FILE = "deprecated_file"
    CODE_DUPLICATE = "code_duplicate"
    QUALITY_ISSUE = "quality_issue"
    ARCHITECTURE_CHANGE = "architecture_change"
    ANALYSIS_COMPLETE = "analysis_complete"
    ERROR = "error"


class NotificationPriority(Enum):
    """Пріоритет сповіщення"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class WindsurfNotification:
    """Сповіщення для Windsurf"""
    
    def __init__(
        self,
        type: NotificationType,
        title: str,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        data: Optional[Dict[str, Any]] = None,
        action: Optional[str] = None
    ):
        self.type = type
        self.title = title
        self.message = message
        self.priority = priority
        self.data = data or {}
        self.action = action
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Конвертувати в словник"""
        return {
            "type": self.type.value,
            "title": self.title,
            "message": self.message,
            "priority": self.priority.value,
            "data": self.data,
            "action": self.action,
            "timestamp": self.timestamp
        }
    
    def to_json(self) -> str:
        """Конвертувати в JSON"""
        return json.dumps(self.to_dict(), ensure_ascii=False)


class WindsurfNotificationManager:
    """Менеджер сповіщень для Windsurf"""
    
    def __init__(self):
        self.notifications: List[WindsurfNotification] = []
        self.handlers: Dict[NotificationType, List] = {}
    
    def register_handler(self, notification_type: NotificationType, handler):
        """Зареєструвати обробник сповіщення"""
        if notification_type not in self.handlers:
            self.handlers[notification_type] = []
        self.handlers[notification_type].append(handler)
    
    def notify(self, notification: WindsurfNotification):
        """Відправити сповіщення"""
        self.notifications.append(notification)
        
        # Викликаємо обробники
        if notification.type in self.handlers:
            for handler in self.handlers[notification.type]:
                try:
                    handler(notification)
                except Exception as e:
                    print(f"❌ Помилка в обробнику: {e}")
    
    def notify_circular_dependency(self, cycle: List[str]):
        """Сповіщення про циклічну залежність"""
        cycle_str = " → ".join(cycle)
        notification = WindsurfNotification(
            type=NotificationType.CIRCULAR_DEPENDENCY,
            title="🔄 Циклічна залежність виявлена",
            message=f"Знайдена циклічна залежність: {cycle_str}",
            priority=NotificationPriority.HIGH,
            data={"cycle": cycle},
            action="show_dependency_graph"
        )
        self.notify(notification)
    
    def notify_unused_file(self, file_path: str, size: int):
        """Сповіщення про невикористовуваний файл"""
        notification = WindsurfNotification(
            type=NotificationType.UNUSED_FILE,
            title="🗑️ Невикористовуваний файл",
            message=f"Файл {file_path} не використовується ({size} байт)",
            priority=NotificationPriority.MEDIUM,
            data={"file": file_path, "size": size},
            action="delete_file"
        )
        self.notify(notification)
    
    def notify_deprecated_file(self, file_path: str, days_old: int):
        """Сповіщення про застарілий файл"""
        notification = WindsurfNotification(
            type=NotificationType.DEPRECATED_FILE,
            title="⚠️ Застарілий файл",
            message=f"Файл {file_path} не змінювався {days_old} днів",
            priority=NotificationPriority.MEDIUM,
            data={"file": file_path, "days_old": days_old},
            action="review_file"
        )
        self.notify(notification)
    
    def notify_code_duplicate(self, files: List[str], lines: int):
        """Сповіщення про дублікат коду"""
        notification = WindsurfNotification(
            type=NotificationType.CODE_DUPLICATE,
            title="📋 Дублікат коду",
            message=f"Знайдено дублікат {lines} рядків у {len(files)} файлах",
            priority=NotificationPriority.MEDIUM,
            data={"files": files, "lines": lines},
            action="show_duplicates"
        )
        self.notify(notification)
    
    def notify_quality_issue(self, file_path: str, issue: str, severity: str):
        """Сповіщення про проблему якості"""
        priority_map = {
            "critical": NotificationPriority.CRITICAL,
            "high": NotificationPriority.HIGH,
            "medium": NotificationPriority.MEDIUM,
            "low": NotificationPriority.LOW
        }
        
        notification = WindsurfNotification(
            type=NotificationType.QUALITY_ISSUE,
            title="⭐ Проблема якості коду",
            message=f"У файлі {file_path}: {issue}",
            priority=priority_map.get(severity, NotificationPriority.MEDIUM),
            data={"file": file_path, "issue": issue, "severity": severity},
            action="fix_quality_issue"
        )
        self.notify(notification)
    
    def notify_architecture_change(self, changes: Dict[str, Any]):
        """Сповіщення про зміни в архітектурі"""
        notification = WindsurfNotification(
            type=NotificationType.ARCHITECTURE_CHANGE,
            title="🏗️ Архітектура змінилась",
            message="Виявлені зміни в архітектурі проекту",
            priority=NotificationPriority.MEDIUM,
            data=changes,
            action="review_changes"
        )
        self.notify(notification)
    
    def notify_analysis_complete(self, stats: Dict[str, Any]):
        """Сповіщення про завершення аналізу"""
        notification = WindsurfNotification(
            type=NotificationType.ANALYSIS_COMPLETE,
            title="✅ Аналіз завершено",
            message=f"Проаналізовано {stats.get('total_files', 0)} файлів",
            priority=NotificationPriority.LOW,
            data=stats,
            action="show_report"
        )
        self.notify(notification)
    
    def notify_error(self, error_message: str):
        """Сповіщення про помилку"""
        notification = WindsurfNotification(
            type=NotificationType.ERROR,
            title="❌ Помилка",
            message=error_message,
            priority=NotificationPriority.CRITICAL,
            action="show_logs"
        )
        self.notify(notification)
    
    def get_recent_notifications(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Отримати останні сповіщення"""
        return [n.to_dict() for n in self.notifications[-limit:]]
    
    def clear_notifications(self):
        """Очистити сповіщення"""
        self.notifications.clear()


# Глобальний менеджер
notification_manager = WindsurfNotificationManager()


def setup_default_handlers():
    """Налаштувати обробники за замовчуванням"""
    
    def log_notification(notification: WindsurfNotification):
        """Логувати сповіщення"""
        print(f"[{notification.priority.value.upper()}] {notification.title}: {notification.message}")
    
    # Реєструємо обробник для всіх типів
    for notif_type in NotificationType:
        notification_manager.register_handler(notif_type, log_notification)


if __name__ == "__main__":
    setup_default_handlers()
    
    # Тестування
    notification_manager.notify_circular_dependency(["a.py", "b.py", "c.py", "a.py"])
    notification_manager.notify_unused_file("old_module.py", 5000)
    notification_manager.notify_code_duplicate(["file1.js", "file2.js"], 50)
    notification_manager.notify_analysis_complete({"total_files": 629, "issues": 15})
    
    print("\n📊 Останні сповіщення:")
    for notif in notification_manager.get_recent_notifications():
        print(f"  - {notif['title']}")
