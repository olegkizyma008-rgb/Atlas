#!/bin/bash

################################################################################
# ATLAS4 Architecture Cleanup Script
# Видалення мертвого коду та оптимізація архітектури
# 
# Дата: 23 листопада 2025
# Версія: 1.0
# Статус: Готово до виконання
################################################################################

set -e

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Базова директорія проекту
PROJECT_ROOT="/Users/dev/Documents/GitHub/atlas4"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}ATLAS4 Architecture Cleanup${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

################################################################################
# ФАЗА 1: КРИТИЧНІ ДУБЛІКАТИ (10 хвилин)
################################################################################

echo -e "${YELLOW}📌 ФАЗА 1: Видалення критичних дублікатів${NC}"
echo ""

# Перевірка перед видаленням
echo -e "${BLUE}🔍 Перевірка файлів перед видаленням...${NC}"

# Перевірити, чи файл дійсно дублікат
if [ -f "$PROJECT_ROOT/codemap-system/mcp_architecture_server.py" ]; then
    echo -e "${YELLOW}⚠️  Знайдено: /codemap-system/mcp_architecture_server.py${NC}"
    
    # Перевірити, чи він використовується
    USAGE_COUNT=$(grep -r "from.*codemap-system.*mcp_architecture_server import\|import.*codemap-system.*mcp_architecture_server" "$PROJECT_ROOT" --exclude-dir=archive --exclude-dir=backups --exclude-dir=.git 2>/dev/null | wc -l)
    
    if [ "$USAGE_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ Файл не використовується, можна видалити${NC}"
        rm "$PROJECT_ROOT/codemap-system/mcp_architecture_server.py"
        echo -e "${GREEN}✅ Видалено: /codemap-system/mcp_architecture_server.py${NC}"
    else
        echo -e "${RED}❌ Файл використовується $USAGE_COUNT разів, не видаляємо${NC}"
    fi
else
    echo -e "${GREEN}✅ Файл вже видалений: /codemap-system/mcp_architecture_server.py${NC}"
fi

echo ""

# Видалити дублікати Architecture Mapper
if [ -f "$PROJECT_ROOT/codemap-system/architecture_mapper.py" ]; then
    echo -e "${YELLOW}⚠️  Знайдено: /codemap-system/architecture_mapper.py${NC}"
    
    # Перевірити, чи він використовується
    USAGE_COUNT=$(grep -r "from.*architecture_mapper import\|import.*architecture_mapper" "$PROJECT_ROOT/codemap-system" --exclude-dir=archive --exclude-dir=backups 2>/dev/null | grep -v "core/architecture_mapper" | wc -l)
    
    if [ "$USAGE_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ Файл не використовується, можна видалити${NC}"
        rm "$PROJECT_ROOT/codemap-system/architecture_mapper.py"
        echo -e "${GREEN}✅ Видалено: /codemap-system/architecture_mapper.py${NC}"
    else
        echo -e "${RED}❌ Файл використовується $USAGE_COUNT разів, не видаляємо${NC}"
    fi
else
    echo -e "${GREEN}✅ Файл вже видалений: /codemap-system/architecture_mapper.py${NC}"
fi

echo ""

# Видалити експериментальну версію Architecture Mapper
if [ -f "$PROJECT_ROOT/codemap-system/core/architecture_mapper_v4.py" ]; then
    echo -e "${YELLOW}⚠️  Знайдено: /codemap-system/core/architecture_mapper_v4.py${NC}"
    
    # Перевірити, чи він використовується
    USAGE_COUNT=$(grep -r "architecture_mapper_v4" "$PROJECT_ROOT" --exclude-dir=archive --exclude-dir=backups --exclude-dir=.git 2>/dev/null | wc -l)
    
    if [ "$USAGE_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ Файл не використовується, можна видалити${NC}"
        rm "$PROJECT_ROOT/codemap-system/core/architecture_mapper_v4.py"
        echo -e "${GREEN}✅ Видалено: /codemap-system/core/architecture_mapper_v4.py${NC}"
    else
        echo -e "${RED}❌ Файл використовується $USAGE_COUNT разів, не видаляємо${NC}"
    fi
else
    echo -e "${GREEN}✅ Файл вже видалений: /codemap-system/core/architecture_mapper_v4.py${NC}"
fi

echo ""
echo -e "${GREEN}✅ ФАЗА 1 ЗАВЕРШЕНА${NC}"
echo ""

################################################################################
# ФАЗА 2: АРХІВНІ ФАЙЛИ (5 хвилин)
################################################################################

echo -e "${YELLOW}📌 ФАЗА 2: Видалення архівних файлів${NC}"
echo ""

ARCHIVE_DIRS=(
    "legacy-orchestrator-2025-10-20"
    "legacy-config-2025-10-20"
    "legacy-processors-2025-10-22"
    "legacy-prompts"
    "legacy-prompts-2025-10-20"
    "mcp-prompts-backup-2025-10-20"
    "root-cleanup"
    "root-cleanup-2025-11-19"
    "tests-docs-2025-10-25"
    "tests-old"
    "docs"
    "docs-old"
    "goose"
)

for dir in "${ARCHIVE_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/archive/$dir"
    if [ -d "$FULL_PATH" ]; then
        echo -e "${YELLOW}⚠️  Видалення: /archive/$dir${NC}"
        rm -rf "$FULL_PATH"
        echo -e "${GREEN}✅ Видалено: /archive/$dir${NC}"
    else
        echo -e "${GREEN}✅ Вже видалено: /archive/$dir${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ ФАЗА 2 ЗАВЕРШЕНА${NC}"
echo ""

################################################################################
# ФАЗА 3: РЕЗЕРВНІ КОПІЇ (5 хвилин)
################################################################################

echo -e "${YELLOW}📌 ФАЗА 3: Видалення резервних копій${NC}"
echo ""

BACKUP_DIRS=(
    "20251114-135805"
    "20251114-140726"
    "codemap"
)

for dir in "${BACKUP_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/backups/$dir"
    if [ -d "$FULL_PATH" ]; then
        echo -e "${YELLOW}⚠️  Видалення: /backups/$dir${NC}"
        rm -rf "$FULL_PATH"
        echo -e "${GREEN}✅ Видалено: /backups/$dir${NC}"
    else
        echo -e "${GREEN}✅ Вже видалено: /backups/$dir${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ ФАЗА 3 ЗАВЕРШЕНА${NC}"
echo ""

################################################################################
# ФАЗА 4: ПОРОЖНІ ДИРЕКТОРІЇ (5 хвилин)
################################################################################

echo -e "${YELLOW}📌 ФАЗА 4: Видалення порожних директорій${NC}"
echo ""

EMPTY_DIRS=(
    "web/core"
    "web/middleware"
    "web/routes"
    "orchestrator/codemap-system"
)

for dir in "${EMPTY_DIRS[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$dir"
    if [ -d "$FULL_PATH" ]; then
        if [ -z "$(ls -A "$FULL_PATH")" ]; then
            echo -e "${YELLOW}⚠️  Видалення: /$dir${NC}"
            rm -rf "$FULL_PATH"
            echo -e "${GREEN}✅ Видалено: /$dir${NC}"
        else
            echo -e "${YELLOW}⚠️  Директорія не порожня: /$dir${NC}"
        fi
    else
        echo -e "${GREEN}✅ Вже видалена: /$dir${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ ФАЗА 4 ЗАВЕРШЕНА${NC}"
echo ""

################################################################################
# ФАЗА 5: НЕВИКОРИСТОВУВАНІ МОДУЛІ (5 хвилин)
################################################################################

echo -e "${YELLOW}📌 ФАЗА 5: Видалення невикористовуваних модулів${NC}"
echo ""

UNUSED_FILES=(
    "codemap-system/quick_analysis.py"
    "codemap-system/quick_test.py"
    "codemap-system/simple_mcp_test.py"
    "codemap-system/optimization_report.py"
    "codemap-system/optimize_reports.py"
    "codemap-system/structure_configs.py"
)

for file in "${UNUSED_FILES[@]}"; do
    FULL_PATH="$PROJECT_ROOT/$file"
    if [ -f "$FULL_PATH" ]; then
        echo -e "${YELLOW}⚠️  Видалення: /$file${NC}"
        rm "$FULL_PATH"
        echo -e "${GREEN}✅ Видалено: /$file${NC}"
    else
        echo -e "${GREEN}✅ Вже видалено: /$file${NC}"
    fi
done

echo ""
echo -e "${GREEN}✅ ФАЗА 5 ЗАВЕРШЕНА${NC}"
echo ""

################################################################################
# ФІНАЛЬНА ПЕРЕВІРКА
################################################################################

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}ФІНАЛЬНА ПЕРЕВІРКА${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

echo -e "${BLUE}🔍 Перевірка архітектури...${NC}"

# Перевірити, чи дублікати дійсно видалені
if [ ! -f "$PROJECT_ROOT/codemap-system/mcp_architecture_server.py" ] && \
   [ ! -f "$PROJECT_ROOT/codemap-system/architecture_mapper.py" ] && \
   [ ! -f "$PROJECT_ROOT/codemap-system/core/architecture_mapper_v4.py" ]; then
    echo -e "${GREEN}✅ Дублікати видалені${NC}"
else
    echo -e "${RED}❌ Деякі дублікати залишилися${NC}"
fi

# Перевірити, чи архівні файли видалені
if [ ! -d "$PROJECT_ROOT/archive/legacy-orchestrator-2025-10-20" ] && \
   [ ! -d "$PROJECT_ROOT/archive/legacy-config-2025-10-20" ]; then
    echo -e "${GREEN}✅ Архівні файли видалені${NC}"
else
    echo -e "${RED}❌ Деякі архівні файли залишилися${NC}"
fi

# Перевірити, чи резервні копії видалені
if [ ! -d "$PROJECT_ROOT/backups/20251114-135805" ] && \
   [ ! -d "$PROJECT_ROOT/backups/20251114-140726" ]; then
    echo -e "${GREEN}✅ Резервні копії видалені${NC}"
else
    echo -e "${RED}❌ Деякі резервні копії залишилися${NC}"
fi

echo ""

# Розрахувати розмір проекту
TOTAL_SIZE=$(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1)
echo -e "${BLUE}📊 Загальний розмір проекту: $TOTAL_SIZE${NC}"

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ ОЧИСТКА ЗАВЕРШЕНА УСПІШНО${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

echo -e "${BLUE}📝 Наступні кроки:${NC}"
echo "1. Запустити тести: npm run test:all"
echo "2. Перевірити функціональність"
echo "3. Прочитати ARCHITECTURE_IMPROVEMENT_PLAN.md"
echo ""

exit 0
