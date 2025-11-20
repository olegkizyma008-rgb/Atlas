#!/bin/bash
# MCP Server Launcher
# Запускає MCP сервер з правильною директорією та змінними оточення

PROJECT_ROOT="/Users/dev/Documents/GitHub/atlas4"
CODEMAP_DIR="$PROJECT_ROOT/codemap-system"

# Встановлюємо змінні оточення
export PYTHONPATH="$CODEMAP_DIR"
export PROJECT_ROOT="$PROJECT_ROOT"
export PYTHONUNBUFFERED=1

# Обираємо інтерпретатор Python
PY="$PROJECT_ROOT/.venv/bin/python"
if [ ! -x "$PY" ]; then
  if command -v python3 >/dev/null 2>&1; then
    PY="$(command -v python3)"
  else
    echo "❌ Python3 не знайдено. Встановіть Python3 або створіть .venv у корені проекту." 1>&2
    exit 1
  fi
fi

# Запускаємо сервер
exec "$PY" "$CODEMAP_DIR/core/mcp_windsurf_server_fast.py"
