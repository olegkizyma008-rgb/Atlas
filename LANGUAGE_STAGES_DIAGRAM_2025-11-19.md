# Діаграма формування мови по етапах (2025-11-19)

## 🔄 ПОВНИЙ ПОТІК МОВИ В СИСТЕМІ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ATLAS SYSTEM LANGUAGE FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. КОНФІГ (.env)                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ USER_LANGUAGE=uk                                                            │
│ SHOW_SYSTEM_MESSAGES=false                                                  │
│ SYSTEM_MESSAGE_LEVEL=1                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. ІНІЦІАЛІЗАЦІЯ (DI Container)                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ LocalizationService.getUserLanguage() → 'uk'                               │
│ [LOCALIZATION] User language: uk                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
        ┌───────────────────────────┼───────────────────────────┐
        ↓                           ↓                           ↓
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  CHAT INTERFACE  │      │  MCP WORKFLOW    │      │  TTS SYSTEM      │
│  (Web Browser)   │      │  (Orchestrator)  │      │  (Voice Output)  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 📊 ЕТАП 1: CHAT (Веб-чат)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAT INTERFACE (Web)                         │
└─────────────────────────────────────────────────────────────────┘

User Input (будь-яка мова)
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ /api/chat (chat.routes.js)                                      │
│ ├─ Отримує: userMessage                                         │
│ ├─ Резолюємо: localizationService                              │
│ └─ Передаємо: executeWorkflow()                                │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ executeWorkflow() (executor-v3.js)                              │
│ ├─ Замінюємо: {{USER_LANGUAGE}} → 'uk'                        │
│ ├─ Промпт: "respond in {{USER_LANGUAGE}}"                     │
│ └─ Результат: Atlas відповідає українською                     │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ ATLAS RESPONSE (Ukrainian)                                      │
│ "Привіт! Як я можу тобі допомогти?"                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 ЕТАП 2: MCP WORKFLOW (Основні етапи)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MCP WORKFLOW STAGES                               │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1.0: ROUTER CLASSIFIER                                    │
│ ├─ Input: User message (будь-яка мова)                         │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Classify intent                                           │
│ │  ├─ Select servers                                            │
│ │  └─ Route to appropriate handler                              │
│ ├─ Output: Server selection (English)                           │
│ └─ TTS: NONE                                                    │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2.0: SERVER SELECTION                                     │
│ ├─ Input: Classified intent (English)                           │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Select MCP servers                                        │
│ │  ├─ Validate tool availability                                │
│ │  └─ Prepare tool schema                                       │
│ ├─ Output: Selected servers (English)                           │
│ └─ TTS: NONE                                                    │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2.1: PLAN TOOLS (Tetyana)                                │
│ ├─ Input: Selected servers (English)                            │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Generate tool calls                                       │
│ │  ├─ Validate parameters                                       │
│ │  └─ Create execution plan                                     │
│ ├─ Output: Tool calls (English)                                 │
│ │  ├─ tool_calls: [...] (English)                              │
│ │  ├─ reasoning: 🇺🇦 UKRAINIAN                                │
│ │  └─ tts_phrase: 🇺🇦 UKRAINIAN                               │
│ └─ TTS: ✅ Tetyana говорить українською                        │
│    "Додати 27 до поточного результату в калькуляторі"          │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2.2: EXECUTE TOOLS (Tetyana)                             │
│ ├─ Input: Tool calls (English)                                  │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Execute MCP tools                                         │
│ │  ├─ Collect results                                           │
│ │  └─ Validate execution                                        │
│ ├─ Output: Execution results (English)                          │
│ └─ TTS: ✅ Tetyana говорить успіх                              │
│    "Виконано"                                                   │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2.3: VERIFY ITEM (Grisha)                                │
│ ├─ Input: Execution results (English)                           │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Analyze results                                           │
│ │  ├─ Compare with success criteria                             │
│ │  └─ Generate verification report                              │
│ ├─ Output: Verification result (English)                        │
│ └─ TTS: ✅ Grisha говорить результат                           │
│    "Підтверджено" або "Не підтверджено"                        │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3.0: FINAL SUMMARY                                        │
│ ├─ Input: All results (English)                                 │
│ ├─ Processing: 🇬🇧 ENGLISH ONLY                               │
│ │  ├─ Aggregate results                                         │
│ │  ├─ Generate summary                                          │
│ │  └─ Prepare report                                            │
│ ├─ Output: Summary (English)                                    │
│ └─ TTS: NONE                                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔊 ЕТАП 3: TTS (Text-to-Speech)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    TTS FLOW (Voice Output)                           │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TETYANA EXECUTION PHASE                                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. System generates: "Add 27 in Calculator" (English)          │
│ 2. LocalizationService.translateToUser()                        │
│    → "Додати 27 до поточного результату в калькуляторі"        │
│ 3. TTSSyncManager.speak(phrase, {agent: 'tetyana'})            │
│ 4. WebSocket broadcast to frontend                              │
│ 5. Frontend TTS engine: Озвучує українською                    │
│ 6. User hears: 🔊 "Додати 27 до поточного результату..."      │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ GRISHA VERIFICATION PHASE                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Verification complete (English)                              │
│ 2. Generate TTS phrase: "Підтверджено" (Ukrainian)             │
│ 3. TTSSyncManager.speak(phrase, {agent: 'grisha'})             │
│ 4. WebSocket broadcast to frontend                              │
│ 5. Frontend TTS engine: Озвучує українською                    │
│ 6. User hears: 🔊 "Підтверджено"                              │
└─────────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────────┐
│ ATLAS CHAT PHASE                                                │
├─────────────────────────────────────────────────────────────────┤
│ 1. User asks question (any language)                            │
│ 2. Atlas processes (English internally)                         │
│ 3. Atlas responds in {{USER_LANGUAGE}} = Ukrainian             │
│ 4. TTSSyncManager.speak(response, {agent: 'atlas'})            │
│ 5. WebSocket broadcast to frontend                              │
│ 6. Frontend TTS engine: Озвучує українською                    │
│ 7. User hears: 🔊 "Привіт! Як я можу тобі допомогти?"        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 ПРИКЛАД: Повний потік операції

```
USER COMMAND: "Додай 27 до результату в калькуляторі"
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 1. ROUTER CLASSIFIER (🇬🇧 English)                             │
│    Input: "Додай 27 до результату в калькуляторі"             │
│    Process: Translate to English internally                     │
│    Output: "Add 27 to result in Calculator"                    │
│    TTS: NONE                                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SERVER SELECTION (🇬🇧 English)                              │
│    Input: "Add 27 to result in Calculator"                     │
│    Process: Select applescript server                           │
│    Output: applescript selected                                 │
│    TTS: NONE                                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. PLAN TOOLS (🇬🇧 English + 🇺🇦 Ukrainian)                   │
│    Input: applescript server                                    │
│    Process: Generate tool calls (English)                       │
│    Output: {                                                    │
│      tool_calls: [applescript__execute],                       │
│      reasoning: "Додати 27 до результату",                    │
│      tts_phrase: "Додати 27 до результату в калькуляторі"    │
│    }                                                            │
│    TTS: ✅ "Додати 27 до результату в калькуляторі"           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. EXECUTE TOOLS (🇬🇧 English)                                 │
│    Input: applescript__execute                                  │
│    Process: Execute AppleScript code                            │
│    Output: {success: true, result: 915}                         │
│    TTS: ✅ "Виконано"                                          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. VERIFY ITEM (🇬🇧 English)                                   │
│    Input: {success: true, result: 915}                          │
│    Process: Compare with success criteria                       │
│    Output: {verified: true}                                     │
│    TTS: ✅ "Підтверджено"                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. FINAL SUMMARY (🇬🇧 English)                                 │
│    Input: All results                                           │
│    Process: Generate summary                                    │
│    Output: "Task completed successfully"                        │
│    TTS: NONE (or translated to Ukrainian if enabled)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎭 АГЕНТИ ТА МОВИ

```
┌──────────────────────────────────────────────────────────────────────┐
│                    AGENT LANGUAGE MATRIX                             │
└──────────────────────────────────────────────────────────────────────┘

TETYANA (Виконавець)
├─ Внутрішня логіка: 🇬🇧 English
├─ Виконання дій: 🇬🇧 English
├─ Говорить (TTS): 🇺🇦 Ukrainian
└─ Приклад: "Додати 27 до поточного результату в калькуляторі"

GRISHA (Верифікатор)
├─ Внутрішня логіка: 🇬🇧 English
├─ Верифікація: 🇬🇧 English
├─ Говорить (TTS): 🇺🇦 Ukrainian
└─ Приклад: "Підтверджено" або "Не підтверджено"

ATLAS (Чат)
├─ Внутрішня логіка: 🇬🇧 English
├─ Розуміння: 🇬🇧 English
├─ Відповідь: 🇺🇦 Ukrainian
└─ Приклад: "Привіт! Як я можу тобі допомогти?"

SYSTEM (Логування)
├─ Внутрішня логіка: 🇬🇧 English
├─ Логи: 🇬🇧 English
├─ Показувати: false (SHOW_SYSTEM_MESSAGES=false)
└─ Приклад: "[GRISHA] ✅ Verification complete"
```

---

## 🔄 ТРАНСФОРМАЦІЯ МОВИ

```
┌──────────────────────────────────────────────────────────────────────┐
│              LANGUAGE TRANSFORMATION PIPELINE                        │
└──────────────────────────────────────────────────────────────────────┘

INPUT (User)
    ↓
    │ [Any language]
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ ROUTER CLASSIFIER                                               │
│ └─ Translate to English internally                             │
└─────────────────────────────────────────────────────────────────┘
    ↓
    │ [English]
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ MCP WORKFLOW (All stages)                                       │
│ ├─ Process: English only                                        │
│ ├─ Generate: English tool calls                                 │
│ └─ Verify: English logic                                        │
└─────────────────────────────────────────────────────────────────┘
    ↓
    │ [English results]
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ LOCALIZATION SERVICE                                            │
│ └─ Translate to User Language (Ukrainian)                       │
└─────────────────────────────────────────────────────────────────┘
    ↓
    │ [Ukrainian]
    ↓
┌─────────────────────────────────────────────────────────────────┐
│ TTS SYSTEM                                                      │
│ └─ Speak in User Language (Ukrainian)                          │
└─────────────────────────────────────────────────────────────────┘
    ↓
    │ 🔊 [Audio output]
    ↓
OUTPUT (User hears Ukrainian)
```

---

## 📝 ПРОМПТИ З {{USER_LANGUAGE}}

```
┌──────────────────────────────────────────────────────────────────────┐
│              PROMPT TEMPLATE SUBSTITUTION                            │
└──────────────────────────────────────────────────────────────────────┘

TEMPLATE (в файлі промпту):
    {{USER_LANGUAGE}}
    ↓
SUBSTITUTION (в executor-v3.js):
    .replace('{{USER_LANGUAGE}}', GlobalConfig.USER_LANGUAGE || 'uk')
    ↓
RESULT (для LLM):
    'uk'
    ↓
LLM INSTRUCTION:
    "Respond in {{USER_LANGUAGE}}" 
    → "Respond in uk"
    → "Respond in Ukrainian"

ПРИКЛАД ПРОМПТУ:
    "Process every instruction in English 
     but respond to the user exclusively in {{USER_LANGUAGE}}."
    
    ↓ AFTER SUBSTITUTION ↓
    
    "Process every instruction in English 
     but respond to the user exclusively in uk."
```

---

## ✅ КОНТРОЛЬНИЙ СПИСОК

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LANGUAGE VERIFICATION                             │
└──────────────────────────────────────────────────────────────────────┘

✅ СИСТЕМА (Англійська)
   ├─ [✓] Всі етапи обробляються англійською
   ├─ [✓] Всі логи англійські
   ├─ [✓] Всі промпти англійські
   └─ [✓] Всі інструменти англійські

✅ КОРИСТУВАЧ (Українська)
   ├─ [✓] Chat відповідає українською
   ├─ [✓] Tetyana говорить українською
   ├─ [✓] Grisha говорить українською
   ├─ [✓] Atlas говорить українською
   └─ [✓] TTS озвучує українською

✅ КОНФІГ
   ├─ [✓] USER_LANGUAGE=uk
   ├─ [✓] SHOW_SYSTEM_MESSAGES=false
   ├─ [✓] SYSTEM_MESSAGE_LEVEL=1
   └─ [✓] LocalizationService ініціалізована

✅ ТРАНСЛЯЦІЯ
   ├─ [✓] LocalizationService.translateToUser() працює
   ├─ [✓] Кеш перекладів активний
   ├─ [✓] Словник англійської→української повний
   └─ [✓] Системні шляхи не перекладаються
```

---

## 🎯 ВИСНОВОК

**Мова на системі формується так:**

1. **Конфіг** → `USER_LANGUAGE=uk` з `.env`
2. **Ініціалізація** → `LocalizationService` завантажує конфіг
3. **Система** → Всі етапи обробляються англійською
4. **Промпти** → `{{USER_LANGUAGE}}` замінюється на `uk`
5. **Переклад** → `LocalizationService.translateToUser()` перекладає
6. **TTS** → Агенти говорять українською
7. **Користувач** → Бачить і чує українську мову

**Результат:** Система працює внутрішньо англійською, але користувач взаємодіє українською мовою.
