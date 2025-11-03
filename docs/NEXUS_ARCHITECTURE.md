# NEXUS ARCHITECTURE - Internal Orchestrator

**Дата створення:** 2025-11-03  
**Статус:** Active - Internal API Architecture

---

## 🎯 **ЩО ТАКЕ NEXUS?**

**Nexus Self-Improvement Engine** - це **INTERNAL ORCHESTRATOR**, а НЕ MCP server.

### **Архітектура:**

```
USER REQUEST
    ↓
Stage 0: Mode Selection → "task"
    ↓
Stage 2.0: Server Selection → "windsurf" + "memory"
    ↓
Tetyana: windsurf__analyze_code
    ↓
Windsurf MCP Server
    ↓
┌────────────────────────────────────────┐
│  NEXUS INTERNAL API                    │
│  http://localhost:5101/api/eternity    │
│                                        │
│  Координує:                            │
│  ├─ Windsurf Code Editor               │
│  ├─ Memory MCP (через DI container)   │
│  ├─ Java SDK (через DI container)     │
│  └─ Python SDK (через DI container)   │
└────────────────────────────────────────┘
    ↓
Self-Improvement Engine
    ↓
FIXED CODE ✅
```

---

## 📊 **РІЗНИЦЯ МІЖ MCP SERVER ТА INTERNAL API:**

### **MCP Server (windsurf, memory, java_sdk, python_sdk):**
- ✅ Запускається як окремий процес через `npx` або `node`
- ✅ Комунікує через stdio protocol
- ✅ Обирається в Stage 2.0 Server Selection
- ✅ Має власні інструменти (tools)
- ✅ Обмеження: максимум 2 сервери в Stage 2.0

### **Internal API (Nexus):**
- ✅ HTTP endpoint всередині Orchestrator
- ✅ Викликається через `container.resolve()`
- ✅ Координує ІНШІ MCP сервери
- ✅ Немає обмеження на кількість серверів
- ✅ Доступний через `/api/eternity` та `/api/cascade`

---

## 🔧 **КОМПОНЕНТИ NEXUS:**

### **1. API Routes:**
- `/orchestrator/api/routes/eternity.routes.js`
- `/orchestrator/api/routes/cascade.routes.js`

**Endpoints:**
```javascript
POST /api/eternity              // Self-improvement cycle
GET  /api/eternity/status       // System status
POST /api/cascade/self-analysis // Code analysis
POST /api/cascade/improve       // Apply fixes
```

### **2. Self-Improvement Engine:**
- `/orchestrator/eternity/self-improvement-engine.js`

**Методи:**
```javascript
improve({ problems, context })
analyzeSelf({ scope, depth })
```

### **3. Windsurf Code Editor:**
- `/orchestrator/eternity/windsurf-code-editor.js`

**Інтеграція:**
```javascript
replaceFileContent(filePath, replacements, instruction)
readFile(filePath)
writeFile(filePath, content)
```

---

## 🚀 **WORKFLOW:**

### **Сценарій 1: Bug Fixing через MCP**

```
USER: "Виправ баги в test-nexus-bug.js"
    ↓
Stage 0: task mode
    ↓
Stage 2.0: windsurf + memory (2 servers)
    ↓
Tetyana: 
  - windsurf__analyze_code
  - memory__create_entities
    ↓
Windsurf MCP → викликає Nexus Internal API
    ↓
Nexus координує:
  1. Windsurf Code Editor (аналіз)
  2. Memory MCP (збереження контексту)
  3. Windsurf Code Editor (виправлення)
    ↓
RESULT: Fixed code
```

### **Сценарій 2: Java Project Analysis**

```
USER: "Проаналізуй Java проект"
    ↓
Stage 2.0: java_sdk + memory
    ↓
Tetyana:
  - java_sdk__analyze
  - memory__create_entities
    ↓
Java SDK → аналіз Maven/Gradle
Memory → збереження результатів
    ↓
RESULT: Analysis report
```

---

## ⚠️ **ЧОМУ NEXUS НЕ MCP SERVER?**

### **Проблеми якщо б Nexus був MCP:**

1. **Обмеження 2 серверів:**
   - Stage 2.0 дозволяє максимум 2 сервери
   - Nexus потребує: windsurf + memory + java_sdk + python_sdk = 4 сервери
   - ❌ Неможливо обрати всі разом

2. **Делегація замість інкапсуляції:**
   ```javascript
   // Nexus делегує до інших MCP серверів:
   async saveContext(args) {
     return {
       action: 'delegate_to_mcp',  // ❌ Потребує memory MCP
       server: 'memory'
     };
   }
   ```
   - Nexus НЕ включає memory всередині
   - Він ВИКЛИКАЄ зовнішній memory MCP
   - Це означає що потрібні ОБА сервери

3. **Складність управління процесами:**
   - Справжній meta-server має запускати subprocesses
   - Потрібно управління життєвим циклом дочірніх процесів
   - Набагато складніше ніж Internal API

---

## ✅ **ПЕРЕВАГИ INTERNAL API АРХІТЕКТУРИ:**

1. **Немає обмеження серверів:**
   - Stage 2.0 обирає windsurf + memory (2 сервери)
   - Nexus координує всі інші через DI container
   - Необмежена кількість внутрішніх сервісів

2. **Простіша архітектура:**
   - HTTP API замість stdio protocol
   - DI container для залежностей
   - Немає управління процесами

3. **Краща інтеграція:**
   - Прямий доступ до всіх сервісів Orchestrator
   - Можливість викликати будь-які внутрішні методи
   - Єдина точка входу для self-improvement

---

## 📝 **РЕЄСТРАЦІЯ КОМПОНЕНТІВ:**

### **MCP Registry** (`/config/mcp-registry.js`):
```javascript
servers: {
  windsurf: { ... },    // ✅ MCP Server
  memory: { ... },      // ✅ MCP Server
  java_sdk: { ... },    // ✅ MCP Server
  python_sdk: { ... },  // ✅ MCP Server
  // nexus НЕ тут - це internal API
}
```

### **Service Registry** (`/orchestrator/core/service-registry.js`):
```javascript
container.register('selfImprovementEngine', ...);
container.register('windsurfCodeEditor', ...);
// Nexus компоненти реєструються як сервіси
```

### **Application Routes** (`/orchestrator/core/application.js`):
```javascript
setupEternityRoutes(this.app, { container });
setupCascadeRoutes(this.app, { container });
```

---

## 🎯 **ВИСНОВОК:**

**Nexus Self-Improvement Engine:**
- ❌ НЕ MCP server
- ❌ НЕ в Stage 2.0 Server Selection
- ✅ Internal HTTP API
- ✅ Координує MCP сервери через DI container
- ✅ Немає обмеження на кількість серверів
- ✅ Простіша та ефективніша архітектура

**Для bug fixing:**
- Stage 2.0 обирає: `windsurf` + `memory`
- Windsurf викликає Nexus Internal API
- Nexus координує виправлення
