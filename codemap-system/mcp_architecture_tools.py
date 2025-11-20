#!/usr/bin/env python3
"""
MCP Architecture Tools - Інструменти для роботи з архітектурою
Інтеграція з Windsurf для постійного моніторингу та управління архітектурою
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from architecture_mapper import ArchitectureMapper, FileStatus


class MCPArchitectureTools:
    """MCP інструменти для управління архітектурою"""
    
    def __init__(self, project_root: Path):
        self.project_root = Path(project_root)
        self.mapper = ArchitectureMapper(project_root)
        self.architecture_cache = None
        self.last_analysis_time = None
    
    def get_architecture_overview(self) -> Dict[str, Any]:
        """Отримати огляд архітектури"""
        if not self.architecture_cache or self._should_refresh():
            self.architecture_cache = self.mapper.analyze_architecture(max_depth=5)
            self.last_analysis_time = datetime.now()
        
        return {
            'overview': {
                'total_files': self.architecture_cache['statistics']['total_files'],
                'active_files': self.architecture_cache['statistics']['active_files'],
                'unused_files': self.architecture_cache['statistics']['unused_files'],
                'health_score': self.architecture_cache['health_score']['score'],
            },
            'timestamp': self.architecture_cache['timestamp'],
        }
    
    def get_file_status(self, file_path: str) -> Dict[str, Any]:
        """Отримати статус конкретного файлу"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        if file_path not in self.architecture_cache['files']:
            return {'error': f'File not found: {file_path}'}
        
        file_info = self.architecture_cache['files'][file_path]
        deps = self.architecture_cache['dependencies'].get(file_path, [])
        
        return {
            'path': file_path,
            'status': file_info['status'],
            'size': file_info['size'],
            'lines': file_info['lines'],
            'last_modified': file_info['last_modified'],
            'dependencies': deps,
            'dependents': self._get_dependents(file_path),
            'functions': file_info['functions_count'],
            'classes': file_info['classes_count'],
            'health': self._calculate_file_health(file_path),
        }
    
    def get_dependency_graph(self, file_path: str, depth: int = 2) -> Dict[str, Any]:
        """Отримати граф залежностей для файлу"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        graph = {
            'root': file_path,
            'depth': depth,
            'nodes': {},
            'edges': [],
        }
        
        self._build_dependency_graph(file_path, graph, depth, 0)
        
        return graph
    
    def _build_dependency_graph(self, file_path: str, graph: Dict, max_depth: int, current_depth: int):
        """Рекурсивно будувати граф залежностей"""
        if current_depth >= max_depth or file_path in graph['nodes']:
            return
        
        if not self.architecture_cache:
            return
        
        if file_path not in self.architecture_cache['files']:
            return
        
        file_info = self.architecture_cache['files'][file_path]
        
        graph['nodes'][file_path] = {
            'status': file_info['status'],
            'lines': file_info['lines'],
            'depth': current_depth,
        }
        
        deps = self.architecture_cache['dependencies'].get(file_path, [])
        for dep in deps:
            graph['edges'].append({
                'from': file_path,
                'to': dep,
                'type': 'depends_on',
            })
            
            if current_depth < max_depth - 1:
                self._build_dependency_graph(dep, graph, max_depth, current_depth + 1)
    
    def find_unused_files(self) -> List[Dict[str, Any]]:
        """Знайти невикористовувані файли"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        unused = []
        for file_path, file_info in self.architecture_cache['files'].items():
            if file_info['status'] == FileStatus.UNUSED:
                unused.append({
                    'path': file_path,
                    'size': file_info['size'],
                    'lines': file_info['lines'],
                    'last_modified': file_info['last_modified'],
                })
        
        return sorted(unused, key=lambda x: x['size'], reverse=True)
    
    def find_high_coupling_files(self, threshold: int = 5) -> List[Dict[str, Any]]:
        """Знайти файли з високою зв'язністю"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        high_coupling = []
        for file_path, deps in self.architecture_cache['dependencies'].items():
            if len(deps) >= threshold:
                dependents = self._get_dependents(file_path)
                high_coupling.append({
                    'path': file_path,
                    'dependencies': len(deps),
                    'dependents': len(dependents),
                    'total_coupling': len(deps) + len(dependents),
                })
        
        return sorted(high_coupling, key=lambda x: x['total_coupling'], reverse=True)
    
    def get_architecture_metrics(self) -> Dict[str, Any]:
        """Отримати метрики архітектури"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        stats = self.architecture_cache['statistics']
        health = self.architecture_cache['health_score']
        
        return {
            'statistics': stats,
            'health': health,
            'recommendations': self._generate_recommendations(),
        }
    
    def _get_dependents(self, file_path: str) -> List[str]:
        """Отримати файли, які залежать від цього файлу"""
        if not self.architecture_cache:
            return []
        
        dependents = []
        deps_dict = self.architecture_cache.get('dependencies', {})
        for other_file, deps in deps_dict.items():
            if file_path in deps:
                dependents.append(other_file)
        
        return dependents
    
    def _calculate_file_health(self, file_path: str) -> Dict[str, Any]:
        """Розрахувати здоров'я файлу"""
        if not self.architecture_cache:
            return {}
        
        files_dict = self.architecture_cache.get('files', {})
        file_info = files_dict.get(file_path, {})
        deps_dict = self.architecture_cache.get('dependencies', {})
        deps = deps_dict.get(file_path, [])
        dependents = self._get_dependents(file_path)
        
        score = 100
        
        # Штраф за великий розмір
        if file_info.get('lines', 0) > 500:
            score -= 20
        elif file_info.get('lines', 0) > 300:
            score -= 10
        
        # Штраф за високу залежність
        if len(deps) > 5:
            score -= (len(deps) - 5) * 2
        
        # Штраф за те, що на нього залежать багато файлів
        if len(dependents) > 10:
            score -= 15
        
        return {
            'score': max(0, min(100, score)),
            'size_health': 'good' if file_info.get('lines', 0) < 300 else 'fair' if file_info.get('lines', 0) < 500 else 'poor',
            'coupling_health': 'good' if len(deps) < 3 else 'fair' if len(deps) < 5 else 'poor',
            'dependency_health': 'good' if len(dependents) < 5 else 'fair' if len(dependents) < 10 else 'poor',
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Генерувати рекомендації"""
        recommendations = []
        
        if not self.architecture_cache:
            return recommendations
        
        unused = self.find_unused_files()
        if unused:
            recommendations.append(f"🗑️ Видалити {len(unused)} невикористовуваних файлів")
        
        high_coupling = self.find_high_coupling_files()
        if high_coupling:
            recommendations.append(f"🔗 Розділити {len(high_coupling)} файлів з високою зв'язністю")
        
        stats = self.architecture_cache.get('statistics', {})
        if stats.get('average_lines_per_file', 0) > 400:
            recommendations.append("📏 Розділити великі файли на менші модулі")
        
        health = self.architecture_cache.get('health_score', {})
        if health.get('score', 100) < 70:
            recommendations.append("⚠️ Архітектура потребує рефакторингу")
        
        return recommendations
    
    def _should_refresh(self) -> bool:
        """Перевірити, чи потрібно оновити кеш"""
        if not self.last_analysis_time:
            return True
        
        # Оновлюємо кожні 5 хвилин
        from datetime import timedelta
        return datetime.now() - self.last_analysis_time > timedelta(minutes=5)
    
    def export_architecture_report(self, output_path: Path) -> None:
        """Експортувати детальний звіт про архітектуру"""
        if not self.architecture_cache:
            self.architecture_cache = self.mapper.analyze_architecture()
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'architecture': self.architecture_cache,
            'metrics': self.get_architecture_metrics(),
            'unused_files': self.find_unused_files(),
            'high_coupling_files': self.find_high_coupling_files(),
        }
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"✅ Звіт експортований в {output_path}")


def create_mcp_tools() -> Dict[str, Any]:
    """Створити MCP інструменти для архітектури"""
    project_root = Path(__file__).parent.parent
    tools = MCPArchitectureTools(project_root)
    
    return {
        'get_architecture_overview': {
            'description': 'Отримати огляд архітектури системи',
            'handler': tools.get_architecture_overview,
        },
        'get_file_status': {
            'description': 'Отримати статус конкретного файлу',
            'handler': tools.get_file_status,
            'params': ['file_path'],
        },
        'get_dependency_graph': {
            'description': 'Отримати граф залежностей для файлу',
            'handler': tools.get_dependency_graph,
            'params': ['file_path', 'depth'],
        },
        'find_unused_files': {
            'description': 'Знайти невикористовувані файли',
            'handler': tools.find_unused_files,
        },
        'find_high_coupling_files': {
            'description': 'Знайти файли з високою зв\'язністю',
            'handler': tools.find_high_coupling_files,
            'params': ['threshold'],
        },
        'get_architecture_metrics': {
            'description': 'Отримати метрики архітектури',
            'handler': tools.get_architecture_metrics,
        },
    }


if __name__ == '__main__':
    project_root = Path(__file__).parent.parent
    tools = MCPArchitectureTools(project_root)
    
    # Виводимо огляд
    print("📊 ОГЛЯД АРХІТЕКТУРИ:")
    overview = tools.get_architecture_overview()
    print(json.dumps(overview, indent=2, default=str))
    
    # Виводимо метрики
    print("\n📈 МЕТРИКИ:")
    metrics = tools.get_architecture_metrics()
    print(json.dumps(metrics, indent=2, default=str))
    
    # Експортуємо звіт
    output_path = Path(__file__).parent / 'reports' / 'architecture_detailed_report.json'
    tools.export_architecture_report(output_path)
