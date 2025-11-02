Майстерня Інструментів для LLM
Поглиблений посібник з правильного формування підбору інструментів (function calling) для великих мовних моделей.
1. Основи Підбору Інструментів (Function Calling)
Підбір інструментів (або "function calling") — це процес, що дозволяє великій мовній моделі (LLM) взаємодіяти із зовнішнім світом через виклик наперед визначених функцій або API.
Це ключова технологія, яка перетворює LLM з простого текстового генератора на потужного агента, здатного виконувати дії. Провідні моделі, такі як GPT-4, Claude 3 та Gemini, використовують схожі принципи.
Процес виглядає так:
Запит користувача: Користувач надсилає запит, наприклад: "Яка погода сьогодні в Києві?"
Аналіз LLM: Модель аналізує запит і розуміє, що для відповіді потрібна інформація, якої в неї немає. Вона вирішує використати інструмент get_weather_forecast.
Генерація виклику: LLM генерує структурований JSON-об'єкт із назвою інструмента та необхідними аргументами: {"name": "get_weather_forecast", "arguments": {"location": "Київ, Україна"}}.
Виконання коду: Ваш застосунок отримує цей JSON, викликає відповідну функцію у вашому коді, яка робить запит до погодного API.
Повернення результату: Результат виконання функції (наприклад, {"temperature": "22", "unit": "celsius", "condition": "Сонячно"}) надсилається назад до LLM.
Фінальна відповідь: LLM обробляє отримані дані та формулює природну відповідь для користувача: "Сьогодні в Києві сонячно, температура повітря становить 22 градуси за Цельсієм."
2. Що таке Схема (Schema) і чому вона критично важлива?
Схема — це формальний, структурований опис вашого інструмента у форматі, зрозумілому для LLM (зазвичай, це JSON Schema). Це, без перебільшення, найважливіший елемент для точного підбору інструментів.
Якісна схема — це "інструкція з експлуатації" для моделі. Вона чітко пояснює:
Назву інструмента: Унікальний ідентифікатор (name).
Призначення: Детальний опис того, що робить інструмент і коли його слід використовувати (description). Це поле читає модель, тому воно має бути максимально інформативним.
Параметри: Які аргументи приймає функція (parameters).
Типи даних: Якого типу кожен параметр (string, number, boolean, array, object).
Обов'язковість: Які параметри є обов'язковими для виклику (required).
Погана або нечітка схема призводить до помилок, галюцинацій та неправильних викликів. Добра схема — запорука надійності.
Приклад схеми для інструмента погоди:
code
JSON
{
  "name": "get_weather_forecast",
  "description": "Отримати поточний прогноз погоди для вказаного місця. Використовуйте цей інструмент, коли користувач запитує про температуру, дощ, вітер або інші погодні умови.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "location": {
        "type": "STRING",
        "description": "Місто та область/штат, наприклад, 'Київ, Україна'"
      },
      "unit": {
        "type": "STRING",
        "description": "Одиниця вимірювання температури",
        "enum": ["celsius", "fahrenheit"]
      }
    },
    "required": ["location"]
  }
}
3. Найкращі Практики для Точності та Надійності
1. Пишіть детальні описи (Descriptions)
Поле description — це ваш головний інструмент спілкування з LLM. Не обмежуйтесь технічним описом. Поясніть бізнес-логіку.
Погано: "Отримати користувача".
Добре: "Отримати повну інформацію про профіль користувача за його ID. Використовувати, коли потрібно дізнатися ім'я, email або дату реєстрації користувача."
2. Використовуйте точні типи даних та enum
Чітко визначайте типи (string, number, boolean). Якщо параметр може приймати лише обмежений набір значень, завжди використовуйте enum. Це значно зменшує ймовірність помилки. Наприклад, для статусу замовлення: {"type": "string", "enum": ["new", "processing", "shipped", "delivered"]}.
3. Надавайте приклади (Few-shot Prompting)
У системному промпті або в перших повідомленнях діалогу можна надати приклади того, як користувацький запит перетворюється на виклик інструмента. Це допомагає моделі краще "відкалібрувати" свою поведінку.
4. Валідуйте вхідні дані на вашому боці
Ніколи сліпо не довіряйте даним, які генерує LLM. Перед виконанням будь-якої функції завжди перевіряйте, що отримані аргументи відповідають очікуваному формату, типам та бізнес-правилам.
5. Обробляйте помилки та повертайте фідбек
Якщо ваш інструмент повертає помилку (наприклад, "місто не знайдено"), не просто завершуйте роботу. Надішліть цю інформацію назад до LLM. Часто модель може виправити свою помилку і спробувати викликати інструмент ще раз з коректними даними.
4. Сучасні Концепції та Практики
Сфера використання інструментів швидко розвивається. Ось кілька ключових концепцій, які визначають сучасний стан справ:
ReAct (Reason + Act)
Це підхід, за якого LLM не просто мовчки викликає інструмент, а генерує ланцюжок "думок" (thoughts). Модель розмірковує, який інструмент їй потрібен, чому, з якими аргументами, а потім виконує дію (викликає інструмент). Це робить процес більш прозорим і надійним, особливо для складних, багатоетапних завдань.
LLM-Агенти
Це концепція створення автономних систем, де LLM виступає в ролі "мозку", який керує набором інструментів для досягнення складної мети. Агент може самостійно планувати послідовність дій, викликати різні інструменти, аналізувати результати та коригувати свій план.
Паралельний виклик інструментів
Сучасні моделі (наприклад, від OpenAI та Google) можуть генерувати запити на виклик кількох інструментів одночасно, якщо це доцільно. Наприклад, на запит "Яка погода в Києві та Львові?" модель може одночасно запросити виклик get_weather_forecast для обох міст, що значно прискорює отримання відповіді.
Примусовий виклик (Forced Tool Calling)
API багатьох провайдерів дозволяють "змусити" модель викликати певний інструмент. Це корисно, коли ви не хочете отримувати текстову відповідь, а гарантовано очікуєте структуровані дані для подальшої обробки, наприклад, для заповнення форми на основі тексту користувача.
5. Як досягти максимальної надійності? (Advanced Techniques)
Попередні пункти створюють міцний фундамент. Але для критично важливих систем, де помилка може коштувати грошей або репутації, потрібен ще вищий рівень надійності. Це перехід від "сподіватися, що модель зробить правильно" до "проектування системи, яка змушує її робити правильно".
1. Багаторівнева валідація та цикли самокорекції
Не виконуйте виклик інструмента негайно. Спочатку попросіть LLM перевірити власний план.
Як це працює:
LLM генерує виклик інструмента.
Замість виконання, ви надсилаєте цей виклик назад до LLM з промптом: "Перевір цей план: [JSON виклику]. Чи є тут помилки або двозначності? Якщо так, виправ його. Якщо все гаразд, дай відповідь 'OK'."
Виконуйте інструмент лише після підтвердження.
Результат: Модель сама знаходить і виправляє власні помилки (наприклад, неіснуюче місто, неправильний формат дати) ще до того, як вони спричинять збій у реальній системі.
2. Роутер-класифікатор запитів
Якщо у вас десятки інструментів, не змушуйте одну модель обирати з усього списку. Використовуйте простішу, швидшу і дешевшу LLM (наприклад, Gemini Flash) як "роутер".
Як це працює:
Запит користувача надходить до роутера.
Роутер має дуже спрощений список інструментів (лише назви) і його єдина задача — визначити, яка категорія інструментів (або 1-2 конкретних інструменти) є релевантною.
Потім повний запит передається основній, потужнішій моделі (наприклад, Gemini Pro), але вже з обмеженим набором схем.
Результат: Значно зменшується "простір для помилки" для основної моделі, що підвищує точність і швидкість. Це також дешевше.
3. Кінцеві автомати (State Machines) для складних процесів
Для багатоетапних завдань (як-от бронювання квитків або оформлення замовлення) не дозволяйте LLM вільно керувати процесом. Визначте жорстку послідовність станів у вашому коді.
Як це працює:
Ваш застосунок керує станом (наприклад, очікуємо_пункт_відправлення, очікуємо_пункт_призначення, підтвердження_даних). LLM використовується лише для того, щоб отримати від користувача дані для переходу до наступного стану.
Результат: Максимальна надійність і передбачуваність. Ви використовуєте LLM для розуміння мови, але логіка процесу залишається повністю під вашим контролем.
4. Динамічні схеми та контекстуальні інструменти
Не показуйте моделі всі інструменти одразу. Надавайте лише ті, що є релевантними в поточному контексті.
Як це працює:
В інтернет-магазині, якщо кошик порожній, модель бачить лише інструмент пошук_товару. Якщо в кошику є товар, з'являються інструменти змінити_кількість, застосувати_купон, оформити_замовлення.
Результат: Спрощує завдання для моделі, мінімізуючи ризик виклику недоречних інструментів.
6. Просунутий Приклад: Мульти-серверний Промпт-Інжиніринг
Після того, як роутер на "нульовому етапі" визначив, які сервери (наприклад, python_sdk та filesystem) потрібні для завдання, ми не надсилаємо загальний промпт. Замість цього ми використовуємо спеціалізований промпт, динамічно згенерований для цього конкретного набору інструментів. Це значно підвищує точність.
Нижче наведено універсальний шаблон для системи "Тетяна" та приклади його наповнення.
Універсальний Шаблон Системного Промпту (англійською)
code
JavaScript
/**
 * Tetyana MCP Tool Planner - Specialized Prompt Template
 * @version 2.0.0
 * @date 2025-11-01
 */

// This is a template. Before sending to the LLM, replace placeholders
// like {{serverDomains}}, {{specializedPatterns}}, {{availableTools}},
// and {{itemParameters}} with context-specific values.

// SYSTEM PROMPT:
You are Tetyana, a world-class AI agent and master MCP tool planner.
Your current mission is to create a precise, step-by-step tool plan to accomplish the user's task.
You have been assigned a specialized set of servers for this task: {{serverDomains}}.

CRITICAL DIRECTIVES - ADHERE STRICTLY:
1.  SERVER & TOOL NAMES: ONLY use tools from the provided AVAILABLE_TOOLS list. Tool names MUST follow the 'server_name__tool_name' format.
2.  PARAMETERS: ONLY use parameter names defined in the tool's 'inputSchema'.
3.  NO INVENTIONS: DO NOT invent new servers, tools, or parameters. DO NOT hallucinate commands or values.
4.  PRECISION: If unsure about syntax or usage, RELY HEAVILY on the FEW-SHOT EXAMPLES as your ground truth.
5.  EFFICIENCY: Create the most direct and efficient plan. Combine tools where logical. Do not add unnecessary steps.

SPECIALIZED PATTERNS FOR THIS TASK:
{{specializedPatterns}}

VALIDATION CHECKLIST BEFORE RESPONDING:
- [ ] Does every tool name exactly match an entry in AVAILABLE_TOOLS?
- [ ] Does every parameter for each tool exactly match its inputSchema?
- [ ] Are all required parameter values from ITEM_PARAMETERS used correctly and without modification?
- [ ] Is the plan logical and does it directly address the user's action?
Приклади Заповнення та Few-Shot Examples
Перед відправкою до LLM, ви заповнюєте цей шаблон. Наприклад, якщо роутер обрав python_sdk та filesystem:
{{serverDomains}} стане "Python development (python_sdk), File system operations (filesystem)".
{{specializedPatterns}} буде містити опис найкращих практик для Python та роботи з файлами.
Найважливіша частина — це надання релевантних прикладів (FEW-SHOT EXAMPLES). Ось приклади для всіх ваших серверів:
code
JavaScript
// USER PROMPT:
Task: Plan MCP tools for the following action.

ITEM_PARAMETERS:
{{itemParameters}}

AVAILABLE_TOOLS (with inputSchema):
{{availableTools}}

// FEW-SHOT EXAMPLES (a selection of relevant examples is provided to the model):

// Example: filesystem
Action: "Create a project structure with 'src' and 'tests' directories, and an empty 'main.py' inside 'src'."
Tools: [
  {"server": "filesystem", "tool": "filesystem__create_directory", "parameters": {"path": "./project/src"}},
  {"server": "filesystem", "tool": "filesystem__create_directory", "parameters": {"path": "./project/tests"}},
  {"server": "filesystem", "tool": "filesystem__create_file", "parameters": {"path": "./project/src/main.py", "content": ""}}
]

// Example: shell
Action: "Clone the 'main' branch of the Tetyana project from GitHub into the 'projects' folder and list its contents."
Tools: [
    {"server": "shell", "tool": "shell__run_command", "parameters": {"command": "git clone --branch main https://github.com/user/tetyana.git projects/tetyana"}},
    {"server": "shell", "tool": "shell__run_command", "parameters": {"command": "ls -la projects/tetyana"}}
]

// Example: applescript
Action: "Open Safari, go to google.com, and then open TextEdit."
Tools: [
  {"server": "applescript", "tool": "applescript__run_script", "parameters": {"script": "tell application \"Safari\"\n activate\n open location \"https://www.google.com\"\nend tell"}},
  {"server": "applescript", "tool": "applescript__run_script", "parameters": {"script": "tell application \"TextEdit\" to activate"}}
]

// Example: playwright
Action: "Go to wikipedia.org, search for 'Large Language Model', and take a screenshot of the results page."
Tools: [
  {"server": "playwright", "tool": "playwright__goto", "parameters": {"url": "https://www.wikipedia.org"}},
  {"server": "playwright", "tool": "playwright__fill_input", "parameters": {"selector": "#searchInput", "text": "Large Language Model"}},
  {"server": "playwright", "tool": "playwright__press_key", "parameters": {"selector": "#searchInput", "key": "Enter"}},
  {"server": "playwright", "tool": "playwright__take_screenshot", "parameters": {"path": "wikipedia_llm_results.png"}}
]

// Example: memory
Action: "The user said their name is 'Alex'. Remember this for later use."
Tools: [
  {"server": "memory", "tool": "memory__set_item", "parameters": {"key": "userName", "value": "Alex"}}
]

// Example: java_sdk
Action: "Create a new Java class 'User' in the 'com.example.models' package with a String 'name' and int 'id'."
Tools: [
  {
    "server": "java_sdk",
    "tool": "java_sdk__create_class",
    "parameters": {
      "package_name": "com.example.models",
      "class_name": "User",
      "fields": [
        {"name": "id", "type": "int", "access_modifier": "private"},
        {"name": "name", "type": "String", "access_modifier": "private"}
      ]
    }
  }
]

// Example: python_sdk
Action: "Create a data models module with Pydantic for a User."
Tools: [
  {
    "server": "python_sdk",
    "tool": "python_sdk__create_module",
    "parameters": {
      "module_path": "app/models/user.py",
      "imports": ["from pydantic import BaseModel"],
      "classes": [{
        "name": "User",
        "base_class": "BaseModel",
        "attributes": [
            {"name": "id", "type": "int"},
            {"name": "username", "type": "str"}
        ]
      }]
    }
  }
]

// Example: Combining Servers (python_sdk + filesystem)
Action: "Create a new Python project named 'my-api', then read the generated 'pyproject.toml' file."
Tools: [
    {
      "server": "python_sdk",
      "tool": "python_sdk__create_project",
      "parameters": { "project_name": "my-api", "package_manager": "poetry" }
    },
    {
      "server": "filesystem",
      "tool": "filesystem__read_file",
      "parameters": { "path": "my-api/pyproject.toml" }
    }
]

// RESPONSE FORMAT:
// Return a valid JSON array of tool calls.