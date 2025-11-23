# 🗺️ Тести MCP Сервера

Тести для MCP архітектурного сервера.

## 📋 Тести

- **test_mcp_integration.py** - Тести MCP інтеграції з Windsurf

## 🚀 Запуск

```bash
# Запустити тести MCP сервера
pytest tests/codemap-system/

# Запустити конкретний тест
pytest tests/codemap-system/test_mcp_integration.py

# З детальним виводом
pytest tests/codemap-system/ -vv
```

## 📊 Результати

Всі 8 тестів повинні проходити:
- ✅ MCP Server Initialization
- ✅ Tools List Format
- ✅ JSON-RPC Response Format
- ✅ Windsurf Tool Call Format
- ✅ MCP Protocol Compliance
- ✅ New Tools Integration
- ✅ Error Handling
- ✅ Response Structure for Windsurf

## ✅ Статус

Інтеграція з Windsurf успішна (8/8 тестів пройшло).
