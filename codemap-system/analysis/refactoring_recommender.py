#!/usr/bin/env python3
"""
Refactoring Recommender - Рекомендації рефакторингу
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.architecture_mapper import ArchitectureMapper


class RefactoringRecommendation:
    """Рекомендація рефакторингу"""
    
    def __init__(self, priority: str, category: str, title: str, description: str, 
                 affected_files: Optional[List[str]] = None, impact: str = "medium"):
        self.priority = priority  # critical, high, medium, low
        self.category = category  # structure, naming, duplication, complexity
        self.title = title
        self.description = description
        self.affected_files = affected_files or []
        self.impact = impact  # high, medium, low
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "priority": self.priority,
            "category": self.category,
            "title": self.title,
            "description": self.description,
            "affected_files": self.affected_files,
            "impact": self.impact
        }


class RefactoringRecommender:
    """Рекомендатор рефакторингу"""
    
    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = project_root or Path('.')
        self.mapper = ArchitectureMapper(project_root=self.project_root)
        self.recommendations = []
    
    def analyze_architecture(self) -> List[RefactoringRecommendation]:
        """Аналізувати архітектуру та генерувати рекомендації"""
        self.recommendations = []
        
        try:
            architecture = self.mapper.analyze_architecture(max_depth=2)
        except:
            return self.recommendations
        
        # Аналізуємо циклічні залежності
        cycles = architecture.get('circular_dependencies', [])
        if cycles:
            self.recommendations.append(RefactoringRecommendation(
                priority='critical',
                category='structure',
                title='Розбити циклічні залежності',
                description=f'Знайдено {len(cycles)} циклічних залежностей. Розглянути введення інтерфейсів або переміщення коду.',
                affected_files=[str(c) for c in cycles[0]] if cycles else [],
                impact='high'
            ))
        
        # Аналізуємо невикористовувані файли
        stats = architecture.get('statistics', {})
        unused_count = stats.get('unused_files', 0)
        if unused_count > 0:
            self.recommendations.append(RefactoringRecommendation(
                priority='medium',
                category='structure',
                title='Видалити невикористовувані файли',
                description=f'Знайдено {unused_count} невикористовуваних файлів. Це зменшить складність проекту.',
                impact='low'
            ))
        
        # Аналізуємо залежності
        deps = architecture.get('dependencies', {})
        high_coupling_files = [f for f, d in deps.items() if len(d) > 10]
        if high_coupling_files:
            self.recommendations.append(RefactoringRecommendation(
                priority='high',
                category='structure',
                title='Зменшити зв\'язність модулів',
                description=f'{len(high_coupling_files)} файлів мають більше 10 залежностей. Розглянути розбиття на менші модулі.',
                affected_files=high_coupling_files[:5],
                impact='high'
            ))
        
        # Додаємо загальні рекомендації
        self._add_general_recommendations()
        
        return self.recommendations
    
    def _add_general_recommendations(self):
        """Додати загальні рекомендації"""
        
        recommendations = [
            RefactoringRecommendation(
                priority='high',
                category='naming',
                title='Покращити назви файлів та функцій',
                description='Переконайтесь, що назви ясно описують призначення. Уникайте скорочень.',
                impact='medium'
            ),
            RefactoringRecommendation(
                priority='medium',
                category='duplication',
                title='Видалити дублікати коду',
                description='Витягніть повторюваний код у спільні функції або модулі.',
                impact='medium'
            ),
            RefactoringRecommendation(
                priority='medium',
                category='complexity',
                title='Зменшити складність функцій',
                description='Розбийте великі функції на менші, більш зрозумілі одиниці.',
                impact='medium'
            ),
            RefactoringRecommendation(
                priority='low',
                category='structure',
                title='Додати документацію',
                description='Додайте docstrings та коментарі до складних частин коду.',
                impact='low'
            ),
        ]
        
        self.recommendations.extend(recommendations)
    
    def get_recommendations_by_priority(self, priority: str = 'high') -> List[Dict[str, Any]]:
        """Отримати рекомендації за пріоритетом"""
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        
        filtered = [r for r in self.recommendations if priority_order.get(r.priority, 4) <= priority_order.get(priority, 4)]
        return [r.to_dict() for r in filtered]
    
    def get_recommendations_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Отримати рекомендації за категорією"""
        filtered = [r for r in self.recommendations if r.category == category]
        return [r.to_dict() for r in filtered]
    
    def get_summary(self) -> Dict[str, Any]:
        """Отримати резюме рекомендацій"""
        by_priority = {}
        by_category = {}
        
        for rec in self.recommendations:
            # За пріоритетом
            if rec.priority not in by_priority:
                by_priority[rec.priority] = 0
            by_priority[rec.priority] += 1
            
            # За категорією
            if rec.category not in by_category:
                by_category[rec.category] = 0
            by_category[rec.category] += 1
        
        return {
            "total_recommendations": len(self.recommendations),
            "by_priority": by_priority,
            "by_category": by_category,
            "recommendations": [r.to_dict() for r in self.recommendations]
        }


if __name__ == "__main__":
    recommender = RefactoringRecommender(Path('.'))
    recommender.analyze_architecture()
    
    summary = recommender.get_summary()
    print("🔧 Refactoring Recommendations")
    print(f"Total: {summary['total_recommendations']}")
    print(f"By Priority: {summary['by_priority']}")
    print(f"By Category: {summary['by_category']}")
    print("\n📋 Top Recommendations:")
    for rec in recommender.get_recommendations_by_priority('high')[:5]:
        print(f"  [{rec['priority'].upper()}] {rec['title']}")
        print(f"    {rec['description']}")
