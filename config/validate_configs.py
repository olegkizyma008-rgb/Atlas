#!/usr/bin/env python3
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
