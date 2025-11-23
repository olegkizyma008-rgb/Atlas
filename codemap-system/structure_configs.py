#!/usr/bin/env python3
"""
Структурування та валідація конфігурацій
"""

import json
import shutil
from pathlib import Path
from datetime import datetime

def structure_configs():
    """Створює ієрархію конфігурацій"""
    config_dir = Path("/Users/dev/Documents/GitHub/atlas4/config")
    
    # Нові структури конфігурацій
    new_structure = {
        "core": {
            "description": "Основні конфігурації системи",
            "files": []
        },
        "environments": {
            "description": "Конфігурації середовищ",
            "subdirs": ["development", "production", "test"]
        },
        "services": {
            "description": "Конфігурації сервісів",
            "subdirs": ["api", "websocket", "database"]
        },
        "features": {
            "description": "Конфігурації функцій",
            "subdirs": ["ai", "ml", "tts"]
        },
        "legacy": {
            "description": "Застарілі конфігурації",
            "files": []
        }
    }
    
    # Створюємо нову структуру
    for category, info in new_structure.items():
        category_path = config_dir / category
        category_path.mkdir(exist_ok=True)
        
        # Створюємо README для категорії
        readme = category_path / "README.md"
        if not readme.exists():
            with open(readme, 'w') as f:
                f.write(f"# {category.title()} Configuration\n\n")
                f.write(f"{info['description']}\n\n")
                if 'subdirs' in info:
                    f.write("## Subdirectories:\n")
                    for subdir in info['subdirs']:
                        f.write(f"- `{subdir}/` - {subdir} configuration\n")
        
        if 'subdirs' in info:
            for subdir in info['subdirs']:
                (category_path / subdir).mkdir(exist_ok=True)
    
    # Переміщуємо існуючі конфігурації
    existing_configs = list(config_dir.glob("*.js"))
    
    for config_file in existing_configs:
        name = config_file.stem
        
        # Визначаємо категорію за назвою
        if 'test' in name.lower():
            target_dir = config_dir / "environments" / "test"
        elif 'dev' in name.lower() or 'development' in name.lower():
            target_dir = config_dir / "environments" / "development"
        elif 'prod' in name.lower() or 'production' in name.lower():
            target_dir = config_dir / "environments" / "production"
        elif 'api' in name.lower():
            target_dir = config_dir / "services" / "api"
        elif 'websocket' in name.lower() or 'ws' in name.lower():
            target_dir = config_dir / "services" / "websocket"
        elif 'ai' in name.lower() or 'ml' in name.lower() or 'tts' in name.lower():
            if 'ai' in name.lower():
                target_dir = config_dir / "features" / "ai"
            elif 'ml' in name.lower():
                target_dir = config_dir / "features" / "ml"
            else:
                target_dir = config_dir / "features" / "tts"
        elif 'agent' in name.lower():
            target_dir = config_dir / "core"
        elif 'global' in name.lower() or 'atlas' in name.lower():
            target_dir = config_dir / "core"
        else:
            target_dir = config_dir / "legacy"
        
        target_dir.mkdir(parents=True, exist_ok=True)
        new_path = target_dir / config_file.name
        
        if not new_path.exists():
            shutil.move(str(config_file), str(new_path))
            print(f"Переміщено: {config_file.name} → {target_dir.name}/")

def create_config_validator():
    """Створює валідатор конфігурацій"""
    validator_code = '''#!/usr/bin/env python3
"""
Валідатор конфігураційних файлів
"""

import json
import jsonschema
from pathlib import Path

def validate_config(config_path):
    """Валідує конфігураційний файл"""
    # Базова схема для конфігурацій
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "version": {"type": "string"},
            "environment": {"type": "string", "enum": ["development", "production", "test"]},
            "services": {"type": "object"},
            "features": {"type": "object"}
        },
        "required": ["name", "version"]
    }
    
    try:
        with open(config_path) as f:
            config = json.load(f)
        
        jsonschema.validate(config, schema)
        return True, "✅ Конфігурація валідна"
    except Exception as e:
        return False, f"❌ Помилка валідації: {e}"

if __name__ == "__main__":
    config_dir = Path("/Users/dev/Documents/GitHub/atlas4/config")
    
    for config_file in config_dir.rglob("*.json"):
        is_valid, message = validate_config(config_file)
        print(f"{config_file.name}: {message}")
'''
    
    validator_path = Path("/Users/dev/Documents/GitHub/atlas4/config/validate_configs.py")
    with open(validator_path, 'w') as f:
        f.write(validator_code)
    
    validator_path.chmod(0o755)
    print("✅ Створено валідатор конфігурацій")

def create_config_index():
    """Створює індекс конфігурацій"""
    config_dir = Path("/Users/dev/Documents/GitHub/atlas4/config")
    index = {
        "timestamp": datetime.now().isoformat(),
        "categories": {},
        "total_configs": 0
    }
    
    for category in config_dir.iterdir():
        if category.is_dir() and category.name != "__pycache__":
            configs = list(category.rglob("*.js")) + list(category.rglob("*.json"))
            index["categories"][category.name] = {
                "description": get_category_description(category.name),
                "count": len(configs),
                "files": [c.name for c in configs]
            }
            index["total_configs"] += len(configs)
    
    # Зберігаємо індекс
    with open(config_dir / "index.json", 'w') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Створено індекс: {index['total_configs']} конфігурацій")

def get_category_description(category):
    """Повертає опис категорії"""
    descriptions = {
        "core": "Основні конфігурації системи",
        "environments": "Конфігурації середовищ",
        "services": "Конфігурації сервісів",
        "features": "Конфігурації функцій",
        "legacy": "Застарілі конфігурації"
    }
    return descriptions.get(category, "Невідома категорія")

if __name__ == "__main__":
    print("🏗️ Структурування конфігурацій...")
    structure_configs()
    print()
    
    print("🔍 Створення валідатора...")
    create_config_validator()
    print()
    
    print("📋 Створення індексу...")
    create_config_index()
    print()
    
    print("✅ Структурування конфігурацій завершено!")
