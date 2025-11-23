#!/bin/bash

# 🚀 Architecture System v2.0 - Quick Install
# Швидка установка системи

set -e

# Встановлюємо змінні
CODEMAP_SYSTEM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$CODEMAP_SYSTEM_DIR")"
LOGS_DIR="$PROJECT_ROOT/logs"
MCP_CONFIG="$PROJECT_ROOT/.windsurf/mcp_config.json"
GLOBAL_MCP_CONFIG_DIR="$HOME/.codeium/windsurf"
GLOBAL_MCP_CONFIG="$GLOBAL_MCP_CONFIG_DIR/mcp_config.json"

# Переходимо в папку скрипту
cd "$CODEMAP_SYSTEM_DIR"

echo "🚀 Architecture System v2.0 - Installation"
echo "==========================================="
echo ""

# Кольори
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Крок 1: Перевірка Python
print_step "Перевірка Python"
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не встановлений"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION знайдений"
echo ""

# Крок 2: Створення необхідних директорій
print_step "Створення необхідних директорій"
mkdir -p "$LOGS_DIR"
mkdir -p "$PROJECT_ROOT/.windsurf"
mkdir -p "$GLOBAL_MCP_CONFIG_DIR"
print_success "Директорії створені"
echo ""

# Крок 3: Створення віртуального середовища
print_step "Створення віртуального середовища"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Віртуальне середовище створене"
else
    print_success "Віртуальне середовище вже існує"
fi
echo ""

# Крок 3: Активація
print_step "Активація віртуального середовища"
source venv/bin/activate || . venv/Scripts/activate
print_success "Активовано"
echo ""

# Крок 4: Встановлення залежностей
print_step "Встановлення залежностей"
pip install -q --upgrade pip

# Встановлюємо мінімальні залежності
pip install -q -r requirements-minimal.txt

# Встановлюємо advanced залежності (Рівень 4)
if [ -f "requirements-advanced.txt" ]; then
    print_step "Встановлення advanced залежностей (Рівень 4)"
    pip install -q -r requirements-advanced.txt
    print_success "Advanced залежності встановлені"
else
    print_step "requirements-advanced.txt не знайдений, пропускаємо"
fi

print_success "Залежності встановлені"
echo ""

# Крок 5: Конфігурація
print_step "Налаштування конфігурації"
if [ ! -f ".env.architecture" ]; then
    cp .env.architecture.example .env.architecture
    print_success "Конфігурація створена"
else
    print_success "Конфігурація вже існує"
fi
echo ""

# Крок 6: Створення папок
print_step "Створення необхідних папок"
mkdir -p logs reports .cache
print_success "Папки створені"
echo ""

# Налаштування інтеграції з Windsurf (.windsurf у корені проекту)
print_step "Налаштування інтеграції з Windsurf"

# Визначаємо корінь проекту (на один рівень вище codemap-system, якщо PROJECT_ROOT не встановлений)
PROJECT_ROOT_DIR="${PROJECT_ROOT:-$(cd .. && pwd)}"
WINDSURF_DIR="$PROJECT_ROOT_DIR/.windsurf"
CODEMAP_SYSTEM_DIR="$(pwd)"

mkdir -p "$WINDSURF_DIR"

# MCP конфіг для codemap (локальний)
MCP_CONFIG="$WINDSURF_DIR/mcp_config.json"
if [ ! -f "$MCP_CONFIG" ] || [ ! -s "$MCP_CONFIG" ]; then
    # Конфіг не існує або порожній - створюємо новий
    python3 << PYTHON_EOF
import json

config = {
    "mcpServers": {
        "codemap": {
            "command": "$CODEMAP_SYSTEM_DIR/venv/bin/python3",
            "args": ["$CODEMAP_SYSTEM_DIR/windsurf/mcp_architecture_server.py"],
            "disabled": False,
            "type": "stdio",
            "env": {
                "PYTHONPATH": "$CODEMAP_SYSTEM_DIR",
                "PROJECT_ROOT": "$PROJECT_ROOT_DIR",
                "PYTHONUNBUFFERED": "1"
            }
        }
    }
}

with open("$MCP_CONFIG", "w") as f:
    json.dump(config, f, indent=2)

print("✅ MCP configuration created: $MCP_CONFIG")
PYTHON_EOF
else
    # Конфіг існує і не порожній - додаємо/оновлюємо codemap
    python3 << PYTHON_EOF
import json

try:
    with open("$MCP_CONFIG", "r") as f:
        config = json.load(f)
    
    if "mcpServers" not in config:
        config["mcpServers"] = {}
    
    # Додаємо/оновлюємо codemap сервер
    config["mcpServers"]["codemap"] = {
        "command": "$CODEMAP_SYSTEM_DIR/venv/bin/python3",
        "args": ["$CODEMAP_SYSTEM_DIR/windsurf/mcp_architecture_server.py"],
        "disabled": False,
        "type": "stdio",
        "env": {
            "PYTHONPATH": "$CODEMAP_SYSTEM_DIR",
            "PROJECT_ROOT": "$PROJECT_ROOT_DIR",
            "PYTHONUNBUFFERED": "1"
        }
    }
    
    with open("$MCP_CONFIG", "w") as f:
        json.dump(config, f, indent=2)
    
    print("✅ MCP configuration updated: $MCP_CONFIG")
    
except Exception as e:
    print(f"❌ Error updating MCP configuration: {e}")
    exit(1)
PYTHON_EOF
fi

print_success "MCP configuration updated"
echo ""

# Глобальний конфіг
GLOBAL_MCP_CONFIG="$GLOBAL_MCP_CONFIG_DIR/mcp_config.json"
if [ ! -f "$GLOBAL_MCP_CONFIG" ] || [ ! -s "$GLOBAL_MCP_CONFIG" ]; then
    python3 << PYTHON_EOF
import json

config = {
    "mcpServers": {
        "codemap": {
            "command": "$CODEMAP_SYSTEM_DIR/venv/bin/python3",
            "args": ["$CODEMAP_SYSTEM_DIR/windsurf/mcp_architecture_server.py"],
            "disabled": False,
            "type": "stdio",
            "env": {
                "PYTHONPATH": "$CODEMAP_SYSTEM_DIR",
                "PROJECT_ROOT": "$PROJECT_ROOT_DIR",
                "PYTHONUNBUFFERED": "1"
            }
        }
    }
}

with open("$GLOBAL_MCP_CONFIG", "w") as f:
    json.dump(config, f, indent=2)

print("✅ Global MCP configuration created: $GLOBAL_MCP_CONFIG")
PYTHON_EOF
    print_success "Створено глобальний MCP конфіг: $GLOBAL_MCP_CONFIG"
fi

# Налаштування Windsurf settings
SETTINGS_JSON="$WINDSURF_DIR/settings.json"
if [ ! -f "$SETTINGS_JSON" ]; then
    cat > "$SETTINGS_JSON" <<EOF
{
  "windsurf.cascade.context.includes": [
    "dependency-graph",
    "dead-code-analysis",
    "project-structure"
  ],
  "windsurf.cascade.maxContextTokens": 128000,
  "windsurf.cascade.autoRefresh": true,
  "windsurf.cascade.refreshInterval": 30000,
  "files.exclude": {
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/__pycache__": true,
    "**/dist": true,
    "**/build": true
  }
}
EOF
    print_success "Створено Windsurf settings: $SETTINGS_JSON"
else
    print_success "Windsurf settings вже існує: $SETTINGS_JSON (не змінюємо)"
fi

# Крок 7: Права на виконання
print_step "Встановлення прав на виконання"
chmod +x START_FULL_SYSTEM.sh
chmod +x STOP_FULL_SYSTEM.sh
print_success "Права встановлені"
echo ""

# Крок 8: Тестування
print_step "Тестування системи"
if python3 quick_test.py > /dev/null 2>&1; then
    print_success "Тести пройшли успішно"
else
    echo -e "${YELLOW}⚠️  Деякі тести не пройшли, але система готова${NC}"
fi
echo ""

print_success "✨ Установка завершена!"
echo ""
echo "🚀 Наступні кроки:"
echo "   1. Перезавантажте Windsurf (Cmd+Shift+P → Reload Window)"
echo "   2. Перевірте, що MCP 'codemap' з'явився у списку доступних серверів"
echo "   3. Запустіть систему: ./START_FULL_SYSTEM.sh"
echo ""
echo "📖 Для детальної інформації див.:"
echo "   • QUICK_START.md"
echo "   • DEPLOYMENT_GUIDE.md"
echo ""
echo "🔗 MCP конфіги:"
echo "   • Локальний: $WINDSURF_DIR/mcp_config.json"
echo "   • Глобальний: $GLOBAL_MCP_CONFIG"
echo ""
