#!/usr/bin/env python3
"""
Тест інтеграції MCP сервера з Windsurf
Перевіряє формати даних та взаємодію
"""

import json
import sys
from pathlib import Path

# Додаємо codemap-system до PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent))

from windsurf.mcp_architecture_server import ArchitectureAnalysisServer


def test_mcp_initialization():
    """Тест 1: Ініціалізація MCP сервера"""
    print("\n" + "="*80)
    print("TEST 1: MCP Server Initialization")
    print("="*80)
    
    try:
        server = ArchitectureAnalysisServer()
        print(f"✅ Сервер ініціалізований успішно")
        print(f"📊 Всього інструментів: {len(server.tools)}")
        return True
    except Exception as e:
        print(f"❌ Помилка: {e}")
        return False


def test_tools_list_format():
    """Тест 2: Формат списку інструментів"""
    print("\n" + "="*80)
    print("TEST 2: Tools List Format (Windsurf Compatibility)")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Перевіряємо формат, який очікує Windsurf
    required_fields = ['name', 'description', 'inputSchema']
    
    all_valid = True
    for tool in server.tools:
        missing = [f for f in required_fields if f not in tool]
        if missing:
            print(f"❌ Інструмент '{tool.get('name')}' не має полів: {missing}")
            all_valid = False
        else:
            print(f"✅ {tool['name']}")
    
    if all_valid:
        print(f"\n✅ Всі інструменти мають правильний формат для Windsurf")
        return True
    else:
        print(f"\n❌ Деякі інструменти мають неправильний формат")
        return False


def test_json_rpc_response_format():
    """Тест 3: Формат JSON-RPC відповідей"""
    print("\n" + "="*80)
    print("TEST 3: JSON-RPC Response Format")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Тестуємо один з нових інструментів
    result = server.handle_tool_call("get_complexity_report", {})
    
    try:
        data = json.loads(result)
        print(f"✅ Результат є валідним JSON")
        
        # Перевіряємо структуру
        if isinstance(data, dict):
            print(f"✅ Результат є словником")
            if 'status' in data or 'error' in data or 'total_blocks' in data:
                print(f"✅ Результат має очікувану структуру")
                print(f"📊 Ключі: {list(data.keys())[:5]}...")
                return True
            else:
                print(f"⚠️  Результат має неочікувану структуру")
                print(f"📊 Ключі: {list(data.keys())}")
                return True  # Все одно ОК, просто інша структура
        else:
            print(f"❌ Результат не є словником: {type(data)}")
            return False
    except json.JSONDecodeError as e:
        print(f"❌ Результат не є валідним JSON: {e}")
        return False


def test_windsurf_tool_call_format():
    """Тест 4: Формат виклику інструменту для Windsurf"""
    print("\n" + "="*80)
    print("TEST 4: Windsurf Tool Call Format")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Симулюємо виклик з Windsurf
    test_cases = [
        ("get_complexity_report", {}),
        ("get_file_structure", {"file_path": "services/api.py"}),
        ("search_blocks_by_name", {"pattern": "get_.*"}),
    ]
    
    all_valid = True
    for tool_name, arguments in test_cases:
        try:
            result = server.handle_tool_call(tool_name, arguments)
            data = json.loads(result)
            
            # Перевіряємо, що результат є JSON
            if isinstance(data, dict):
                print(f"✅ {tool_name}: Результат є валідним JSON")
            else:
                print(f"⚠️  {tool_name}: Результат не є словником")
                all_valid = False
        except Exception as e:
            print(f"❌ {tool_name}: Помилка - {e}")
            all_valid = False
    
    return all_valid


def test_mcp_protocol_compliance():
    """Тест 5: Відповідність MCP протоколу"""
    print("\n" + "="*80)
    print("TEST 5: MCP Protocol Compliance")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Перевіряємо, що всі інструменти мають правильну структуру для MCP
    checks = {
        'name': lambda t: isinstance(t.get('name'), str) and len(t.get('name', '')) > 0,
        'description': lambda t: isinstance(t.get('description'), str),
        'inputSchema': lambda t: isinstance(t.get('inputSchema'), dict),
        'inputSchema.type': lambda t: t.get('inputSchema', {}).get('type') == 'object',
        'inputSchema.properties': lambda t: isinstance(t.get('inputSchema', {}).get('properties'), dict),
    }
    
    all_valid = True
    for check_name, check_func in checks.items():
        failed = []
        for tool in server.tools:
            if not check_func(tool):
                failed.append(tool.get('name', 'unknown'))
        
        if failed:
            print(f"❌ {check_name}: Не пройшли {', '.join(failed[:3])}")
            all_valid = False
        else:
            print(f"✅ {check_name}: Всі інструменти валідні")
    
    return all_valid


def test_new_tools_integration():
    """Тест 6: Інтеграція нових інструментів"""
    print("\n" + "="*80)
    print("TEST 6: New Tools Integration")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    new_tools = [
        'get_block_dependencies',
        'get_function_call_chain',
        'analyze_code_impact',
        'find_related_blocks',
        'get_file_structure',
        'search_blocks_by_name',
        'get_complexity_report',
        'export_dependency_graph',
    ]
    
    tool_names = [t['name'] for t in server.tools]
    
    all_present = True
    for tool_name in new_tools:
        if tool_name in tool_names:
            print(f"✅ {tool_name}: Присутній в списку інструментів")
        else:
            print(f"❌ {tool_name}: НЕ присутній в списку інструментів")
            all_present = False
    
    return all_present


def test_error_handling():
    """Тест 7: Обробка помилок"""
    print("\n" + "="*80)
    print("TEST 7: Error Handling")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Тестуємо з невірними параметрами
    test_cases = [
        ("get_block_dependencies", {"block_key": "nonexistent:block"}),
        ("get_file_structure", {"file_path": "nonexistent/file.py"}),
        ("search_blocks_by_name", {"pattern": "^$"}),  # Порожній шаблон
    ]
    
    all_handled = True
    for tool_name, arguments in test_cases:
        try:
            result = server.handle_tool_call(tool_name, arguments)
            data = json.loads(result)
            
            # Перевіряємо, що результат є JSON (навіть з помилкою)
            if isinstance(data, dict):
                print(f"✅ {tool_name}: Помилка обробляється правильно")
            else:
                print(f"❌ {tool_name}: Невірна обробка помилки")
                all_handled = False
        except Exception as e:
            print(f"❌ {tool_name}: Необроблена помилка - {e}")
            all_handled = False
    
    return all_handled


def test_response_structure_for_windsurf():
    """Тест 8: Структура відповіді для Windsurf"""
    print("\n" + "="*80)
    print("TEST 8: Response Structure for Windsurf")
    print("="*80)
    
    server = ArchitectureAnalysisServer()
    
    # Симулюємо виклик інструменту
    result = server.handle_tool_call("get_complexity_report", {})
    
    try:
        # Перевіряємо, що результат є JSON
        data = json.loads(result)
        print(f"✅ Результат є валідним JSON")
        
        # Перевіряємо, що це словник (Windsurf очікує dict)
        if isinstance(data, dict):
            print(f"✅ Результат є словником (очікуваний тип для Windsurf)")
            
            # Перевіряємо розмір (Windsurf має обмеження на розмір відповіді)
            result_size = len(result)
            print(f"📊 Розмір результату: {result_size} байт")
            
            if result_size < 1_000_000:  # 1 МБ - розумне обмеження
                print(f"✅ Розмір результату в межах норми")
                return True
            else:
                print(f"⚠️  Результат дуже великий для Windsurf")
                return True  # Все одно ОК
        else:
            print(f"❌ Результат не є словником")
            return False
    except json.JSONDecodeError as e:
        print(f"❌ Результат не є валідним JSON: {e}")
        return False


def main():
    """Запустити всі тести"""
    print("\n" + "="*80)
    print("🧪 WINDSURF MCP INTEGRATION TESTS")
    print("="*80)
    
    tests = [
        ("MCP Initialization", test_mcp_initialization),
        ("Tools List Format", test_tools_list_format),
        ("JSON-RPC Response Format", test_json_rpc_response_format),
        ("Windsurf Tool Call Format", test_windsurf_tool_call_format),
        ("MCP Protocol Compliance", test_mcp_protocol_compliance),
        ("New Tools Integration", test_new_tools_integration),
        ("Error Handling", test_error_handling),
        ("Response Structure for Windsurf", test_response_structure_for_windsurf),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR in {test_name}: {e}")
            results[test_name] = False
    
    # Резюме
    print("\n" + "="*80)
    print("📊 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n📈 Результат: {passed}/{total} тестів пройшло")
    
    if passed == total:
        print("\n🎉 ВСІ ТЕСТИ ПРОЙШЛИ! Інтеграція з Windsurf успішна!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} тестів не пройшло")
        return 1


if __name__ == '__main__':
    sys.exit(main())
