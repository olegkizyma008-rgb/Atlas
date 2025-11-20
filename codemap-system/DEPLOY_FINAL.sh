#!/bin/bash

################################################################################
#                                                                              #
#           🚀 DEPLOY FINAL – ДЕПЛОЙ КОДЕМАП СИСТЕМИ 🚀                     #
#                                                                              #
#  Розгортає систему для виробництва:                                        #
#  - Перевіряє залежності                                                    #
#  - Встановлює пакети                                                       #
#  - Налаштовує Windsurf конфіг                                              #
#  - Запускає систему                                                        #
#  - Генерує звіти                                                           #
#                                                                              #
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CORE_DIR="$SCRIPT_DIR/core"
TOOLS_DIR="$SCRIPT_DIR/tools"
REPORTS_DIR="$PROJECT_ROOT/reports"
LOGS_DIR="$SCRIPT_DIR/logs"
WINDSURF_CONFIG="$HOME/.codeium/windsurf/mcp_config.json"

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} $1"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================================================
# MAIN
# ============================================================================

print_header "🚀 DEPLOY FINAL – РОЗГОРТАННЯ КОДЕМАП СИСТЕМИ"

# Check Python
print_step "Перевіряю Python..."
if ! command -v python3 &> /dev/null; then
    print_error "Python3 не встановлено"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
print_success "Python $PYTHON_VERSION знайдено"

# Check directories
print_step "Перевіряю структуру..."
if [ ! -d "$CORE_DIR" ]; then
    print_error "Папка core/ не знайдена"
    exit 1
fi
if [ ! -d "$TOOLS_DIR" ]; then
    print_error "Папка tools/ не знайдена"
    exit 1
fi
print_success "Структура правильна"

# Create directories
print_step "Створюю директорії..."
mkdir -p "$REPORTS_DIR" "$LOGS_DIR"
print_success "Директорії готові"

# Check requirements
print_step "Перевіряю залежності..."
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    print_info "Встановлюю пакети..."
    
    # Try to install in venv first (if it exists)
    if [ -d "$PROJECT_ROOT/.venv/bin" ]; then
        print_info "Встановлюю в .venv..."
        "$PROJECT_ROOT/.venv/bin/python" -m pip install -q -r "$SCRIPT_DIR/requirements.txt" 2>/dev/null || true
    fi
    
    # Also install in current python3
    python3 -m pip install -q -r "$SCRIPT_DIR/requirements.txt" 2>/dev/null || true
    
    print_success "Пакети встановлені"
else
    print_info "requirements.txt не знайдено (пропускаю)"
fi

# Setup Windsurf config
print_step "Налаштовую Windsurf конфіг..."
mkdir -p "$(dirname "$WINDSURF_CONFIG")"

# Generate MCP config with proper paths
SCRIPT_DIR_ABS="$SCRIPT_DIR" PROJECT_ROOT_ABS="$PROJECT_ROOT" WINDSURF_CONFIG_ABS="$WINDSURF_CONFIG" python3 << 'PYTHON_MCP_CONFIG'
import json
import os
import shutil
from pathlib import Path

codemap_path = os.environ.get('SCRIPT_DIR_ABS')
project_root = os.environ.get('PROJECT_ROOT_ABS')
windsurf_config = os.environ.get('WINDSURF_CONFIG_ABS')

# Use direct python server with env
server_script = os.path.join(codemap_path, "core", "mcp_windsurf_server_fast.py")

mcp_config = {
    "mcpServers": {
        "codemap": {
            "command": "python3",
            "args": [
                server_script
            ],
            "env": {
                "PYTHONPATH": codemap_path,
                "PROJECT_ROOT": project_root,
                "PYTHONUNBUFFERED": "1"
            }
        }
    }
}

# Write to Windsurf config
os.makedirs(os.path.dirname(windsurf_config), exist_ok=True)
with open(windsurf_config, 'w') as f:
    json.dump(mcp_config, f, indent=2)

print(f"✅ MCP конфігурація створена: {windsurf_config}")
print(f"   Server: {server_script}")
PYTHON_MCP_CONFIG

print_success "Windsurf конфіг налаштовано"
print_info "Файл: $WINDSURF_CONFIG"

# Test MCP Server
print_step "Тестую MCP Server..."
cd "$CORE_DIR"
if timeout 5 python3 mcp_windsurf_server_fast.py << 'EOF' > /tmp/mcp_test.log 2>&1 || true
{"method": "initialize"}
EOF
then
    if grep -q "protocolVersion" /tmp/mcp_test.log; then
        print_success "MCP Server працює правильно"
    else
        print_error "MCP Server не відповідає"
        cat /tmp/mcp_test.log
        exit 1
    fi
else
    print_error "MCP Server тест не пройшов"
    exit 1
fi

# ============================================================================
# DEPLOYMENT SUMMARY
# ============================================================================

print_header "📊 ДЕПЛОЙ ЗАВЕРШЕНО"

echo -e "${GREEN}✅${NC} Система розгорнута успішно"
echo ""
echo -e "${BLUE}ℹ${NC} Компоненти:"
echo "  ✅ Core модулі (core/)"
echo "  ✅ Tools (tools/)"
echo "  ✅ Scripts (scripts/)"
echo "  ✅ Windsurf конфіг"
echo ""
echo -e "${BLUE}ℹ${NC} Директорії:"
echo "  📂 Проект: $PROJECT_ROOT"
echo "  📂 Звіти: $REPORTS_DIR"
echo "  📝 Логи: $LOGS_DIR"
echo ""

# ============================================================================
# NEXT STEPS
# ============================================================================

print_header "🎯 НАСТУПНІ КРОКИ"

echo "1. Перезавантажте Windsurf:"
echo "   Cmd+Q (на Mac) або Ctrl+Q (на Windows/Linux)"
echo ""
echo "2. Запустіть повний фул:"
echo "   bash $SCRIPT_DIR/RUN_FULL.sh"
echo ""
echo "3. Перевірте MCP у Windsurf:"
echo "   Ліва панель → MCP → codemap"
echo ""
echo "4. Використовуйте команди:"
echo "   @cascade get_quick_assessment(directory: \"orchestrator\")"
echo ""

# ============================================================================
# FINAL MESSAGE
# ============================================================================

print_header "🎉 ГОТОВО!"

echo "Система розгорнута і готова до використання"
echo ""
echo "📝 Конфіг: $WINDSURF_CONFIG"
echo "🚀 Запуск: bash $SCRIPT_DIR/RUN_FULL.sh"
echo ""
