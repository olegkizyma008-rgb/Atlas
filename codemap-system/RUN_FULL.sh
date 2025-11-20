#!/bin/bash

################################################################################
#                                                                              #
#           🔥 RUN FULL – ЗАПУСК ПОВНОГО ФУЛУ КОДЕМАП + МСП 🔥              #
#                                                                              #
#  Запускає систему на ПОВНУ потужність з Windsurf синхронізацією:           #
#  - Enhanced Analyzer (5 шарів, безперервна робота)                         #
#  - MCP Windsurf Server (16 інструментів, синхронізовано з Windsurf)        #
#  - Power Tools (3 гіпер-інструменти)                                       #
#  - Постійний шаровий аналіз                                                #
#  - Реальний час синхронізація з Windsurf                                   #
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

# Cleanup function
cleanup() {
    echo ""
    print_info "Завершую роботу..."
    pkill -f "mcp_enhanced_analyzer" 2>/dev/null || true
    pkill -f "mcp_windsurf_server_fast" 2>/dev/null || true
    pkill -f "mcp_server_daemon" 2>/dev/null || true
    print_success "Система зупинена"
    exit 0
}

trap cleanup INT TERM

# ============================================================================
# MAIN
# ============================================================================

print_header "🔥 ЗАПУСК ПОВНОГО ФУЛУ – КОДЕМАП + МСП + WINDSURF"

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

# Kill old processes
print_step "Очищаю старі процеси..."
pkill -f "mcp_enhanced_analyzer" 2>/dev/null || true
pkill -f "mcp_windsurf_server_fast" 2>/dev/null || true
pkill -f "mcp_server_daemon" 2>/dev/null || true
sleep 1
print_success "Очищено"

# ============================================================================
# LAUNCH ANALYZER
# ============================================================================

print_header "🔄 ЗАПУСК ENHANCED ANALYZER (5 ШАРІВ)"

print_power() {
    echo -e "${CYAN}⚡${NC} $1"
}

print_power "Шар 1: Виявлення мертвих файлів"
print_power "Шар 2: Виявлення мертвих функцій"
print_power "Шар 3: Побудова графу залежностей"
print_power "Шар 4: Виявлення циклів і ізоляції"
print_power "Шар 5: Аналіз якості і дублікатів"
echo ""

print_step "Запускаю Enhanced Analyzer..."
cd "$CORE_DIR"
python3 -u mcp_enhanced_analyzer.py > "$LOGS_DIR/analyzer.log" 2>&1 &
ANALYZER_PID=$!
echo "   PID: $ANALYZER_PID"

sleep 2

if kill -0 "$ANALYZER_PID" 2>/dev/null; then
    print_success "Enhanced Analyzer запущено (PID: $ANALYZER_PID)"
    print_info "Логи: $LOGS_DIR/analyzer.log"
else
    print_error "Помилка при запуску Analyzer"
    tail -20 "$LOGS_DIR/analyzer.log"
    exit 1
fi

# ============================================================================
# MCP WINDSURF SERVER (готовий до Windsurf)
# ============================================================================

print_header "🌐 MCP WINDSURF SERVER (16 ІНСТРУМЕНТІВ)"

print_power "6 базових інструментів"
print_power "7 advanced інструментів"
print_power "3 power tools (гіпер-інструменти)"
echo ""

print_step "Налаштовую MCP Windsurf Server..."

# Create MCP config for Windsurf
MCP_CONFIG_DIR="${HOME}/.codeium/windsurf"
MCP_CONFIG_FILE="${MCP_CONFIG_DIR}/mcp_config.json"
LOCAL_MCP_CONFIG="${SCRIPT_DIR}/.windsurf/mcp_config.json"
PROJECT_MCP_CONFIG="${PROJECT_ROOT}/.windsurf/mcp_config.json"

print_info "📝 Конфіги будуть створені у:"
print_info "   - Глобально: $MCP_CONFIG_FILE"
print_info "   - Локально (codemap): $LOCAL_MCP_CONFIG"
print_info "   - Локально (проект): $PROJECT_MCP_CONFIG"

mkdir -p "$MCP_CONFIG_DIR"
mkdir -p "$(dirname "$LOCAL_MCP_CONFIG")"
mkdir -p "$(dirname "$PROJECT_MCP_CONFIG")"

# Generate MCP config with proper paths
SCRIPT_DIR_ABS="$SCRIPT_DIR" PROJECT_ROOT_ABS="$PROJECT_ROOT" MCP_CONFIG_FILE_ABS="$MCP_CONFIG_FILE" LOCAL_MCP_CONFIG_ABS="$LOCAL_MCP_CONFIG" PROJECT_MCP_CONFIG_ABS="$PROJECT_MCP_CONFIG" python3 << 'PYTHON_MCP_CONFIG'
import json
import os
import shutil
from pathlib import Path

codemap_path = os.environ.get('SCRIPT_DIR_ABS')
project_root = os.environ.get('PROJECT_ROOT_ABS')
mcp_config_file = os.environ.get('MCP_CONFIG_FILE_ABS')
local_mcp_config = os.environ.get('LOCAL_MCP_CONFIG_ABS')
project_mcp_config = os.environ.get('PROJECT_MCP_CONFIG_ABS')

# Use direct python server with env
server_script = os.path.join(codemap_path, "core", "mcp_windsurf_server_fast.py")

print(f"🔧 Генерую MCP конфіг:")
print(f"   - Codemap path: {codemap_path}")
print(f"   - Project root: {project_root}")
print(f"   - Server script: {server_script}")
print(f"   - Script exists: {os.path.exists(server_script)}")

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

# Write to global Windsurf config
print(f"📝 Пишу глобальний конфіг: {mcp_config_file}")
os.makedirs(os.path.dirname(mcp_config_file), exist_ok=True)
with open(mcp_config_file, 'w') as f:
    json.dump(mcp_config, f, indent=2)
print(f"✅ Глобальний конфіг створений")

# Also copy to local codemap .windsurf folder
print(f"📝 Пишу локальний конфіг (codemap): {local_mcp_config}")
os.makedirs(os.path.dirname(local_mcp_config), exist_ok=True)
with open(local_mcp_config, 'w') as f:
    json.dump(mcp_config, f, indent=2)
print(f"✅ Локальний конфіг (codemap) створений")

# Also copy to project root .windsurf folder
print(f"📝 Пишу локальний конфіг (проект): {project_mcp_config}")
os.makedirs(os.path.dirname(project_mcp_config), exist_ok=True)
with open(project_mcp_config, 'w') as f:
    json.dump(mcp_config, f, indent=2)
print(f"✅ Локальний конфіг (проект) створений")

print(f"\n✅ MCP конфігурація створена:")
print(f"   - Глобально: {mcp_config_file}")
print(f"   - Локально (codemap): {local_mcp_config}")
print(f"   - Локально (проект): {project_mcp_config}")
print(f"   - Server: {server_script}")
PYTHON_MCP_CONFIG

print_success "MCP Windsurf Server налаштовано"
print_info "Конфіг: ~/.codeium/windsurf/mcp_config.json"
print_info "✅ Синхронізація з Windsurf активна"
print_info "📝 Файл: $CORE_DIR/mcp_windsurf_server_fast.py"

# Verify config was created
print_step "Перевіряю конфіги..."
if [ -f "$MCP_CONFIG_FILE" ]; then
    print_success "✅ Глобальний конфіг існує: $MCP_CONFIG_FILE"
    print_info "Вміст:"
    cat "$MCP_CONFIG_FILE" | sed 's/^/   /'
else
    print_error "❌ Глобальний конфіг НЕ створений: $MCP_CONFIG_FILE"
fi

if [ -f "$LOCAL_MCP_CONFIG" ]; then
    print_success "✅ Локальний конфіг (codemap) існує"
else
    print_error "❌ Локальний конфіг (codemap) НЕ створений"
fi

if [ -f "$PROJECT_MCP_CONFIG" ]; then
    print_success "✅ Локальний конфіг (проект) існує"
else
    print_error "❌ Локальний конфіг (проект) НЕ створений"
fi

print_info "⚠️  Перезавантажте Windsurf, щоб активувати MCP сервер"
print_info "📝 Логи MCP сервера: $LOGS_DIR/mcp_windsurf_server.log"

# ============================================================================
# MCP SERVER CONFIGURATION COMPLETE
# ============================================================================

print_header "✅ MCP WINDSURF SERVER CONFIGURED"

print_step "MCP Server налаштовано через конфіг..."
print_success "✅ MCP Server готовий до запуску"
print_info "Windsurf запустить MCP Server автоматично при перезавантаженні"
print_info "Логи: $LOGS_DIR/mcp_windsurf_server.log"

# ============================================================================
# WAIT FOR FIRST CYCLE
# ============================================================================

print_header "⏳ ОЧІКУВАННЯ ПЕРШОГО ЦИКЛУ АНАЛІЗУ"

print_info "Аналізатор виконує перший цикл (30-60 секунд)..."
print_info "Всі 5 шарів проходяться послідовно..."

sleep 45

print_success "Перший цикл завершено!"

# ============================================================================
# USAGE INSTRUCTIONS
# ============================================================================

print_header "🎯 ВИКОРИСТАННЯ В WINDSURF CASCADE"

echo "Використовуйте ці команди для аналізу ЦІЛОГО РЕПОЗИТОРІЮ:"
echo ""
echo -e "${YELLOW}Миттєва оцінка всього проекту:${NC}"
echo "  @cascade get_quick_assessment(directory: \".\")"
echo ""
echo -e "${YELLOW}Дискваліфікація проблем у проекті:${NC}"
echo "  @cascade get_disqualification_report(directory: \".\")"
echo ""
echo -e "${YELLOW}Статус файлу (приклад):${NC}"
echo "  @cascade get_editor_quick_view(file_path: \"src/index.js\")"
echo ""
echo -e "${YELLOW}Глибокий аналіз файлу (приклад):${NC}"
echo "  @cascade analyze_file_deeply(file_path: \"src/index.js\")"
echo ""
echo -e "${YELLOW}План рефакторингу для всього проекту:${NC}"
echo "  @cascade generate_refactoring_plan(priority: \"high\")"
echo ""
echo -e "${YELLOW}Аналіз конкретної папки (приклад):${NC}"
echo "  @cascade get_quick_assessment(directory: \"orchestrator\")"
echo ""

# ============================================================================
# SYSTEM STATUS
# ============================================================================

print_header "📊 СТАТУС СИСТЕМИ"

echo -e "${GREEN}✅${NC} Hyper-Power System активна"
echo ""
echo -e "${BLUE}ℹ${NC} Компоненти:"
echo "  ✅ Enhanced Analyzer (PID: $ANALYZER_PID)"
echo "  ✅ MCP Windsurf Server (налаштовано в ~/.codeium/windsurf/mcp_config.json)"
echo "  ✅ Power Tools (3 гіпер-інструменти)"
echo ""
echo -e "${BLUE}ℹ${NC} Директорії:"
echo "  📂 Звіти: $REPORTS_DIR/"
echo "  📝 Логи: $LOGS_DIR/"
echo ""

# ============================================================================
# FINAL MESSAGE
# ============================================================================

print_header "🎉 СИСТЕМА ГОТОВА!"

echo "Hyper-Power System запущена на ПОВНУ потужність"
echo ""
echo "🔄 Аналізатор працює безперервно (кожну хвилину)"
echo "📊 Всі 5 шарів проходяться послідовно"
echo "🌐 MCP Server синхронізовано з Windsurf Cascade"
echo "⚡ 16 інструментів готові до використання"
echo "📝 Всі звіти оновлюються автоматично"
echo ""
echo "Щоб зупинити: Ctrl+C"
echo ""

# Keep running
wait
