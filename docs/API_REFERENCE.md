# ATLAS v5.0 - API Reference

## Orchestrator API Endpoints

### Base URL
```
http://localhost:5101
```

## Chat Endpoints

### POST /chat/stream
Головний endpoint для обробки повідомлень через MCP workflow

**Request:**
```json
{
  "message": "string",
  "sessionId": "string (optional)",
  "stopDispatch": "boolean (optional)"
}
```

**Response:** Server-Sent Events (SSE)
```
data: {"type":"agent","agent":"atlas","message":"..."}
data: {"type":"stage","stage":"1-mcp","status":"processing"}
data: {"type":"todo","items":[...]}
data: {"type":"item_executing","item_id":"1"}
data: {"type":"complete","summary":"..."}
```

### POST /session/pause
Призупинити виконання сесії

**Request:**
```json
{
  "sessionId": "string"
}
```

### POST /session/resume
Відновити виконання сесії

**Request:**
```json
{
  "sessionId": "string"
}
```

### POST /session/confirm
Підтвердити дію користувача

**Request:**
```json
{
  "sessionId": "string",
  "confirmed": "boolean"
}
```

## Health & Status

### GET /health
Перевірка здоров'я системи

**Response:**
```json
{
  "status": "ok",
  "services": {
    "orchestrator": "running",
    "mcp": "6 servers active",
    "tts": "connected",
    "whisper": "connected"
  }
}
```

## TTS Endpoints

### POST /tts/optimize
Оптимізація TTS налаштувань

**Request:**
```json
{
  "voice": "string",
  "speed": "number",
  "pitch": "number"
}
```

## Fallback LLM Endpoints

### POST /v1/chat/completions
OpenAI-сумісний endpoint для LLM запитів

### GET /v1/models
Список доступних моделей

## WebSocket Events

### Connection
```javascript
ws://localhost:5101
```

### Events:
- `chat_update` - Оновлення чату
- `agent_message` - Повідомлення агента
- `tts_start` - Початок TTS
- `tts_complete` - Завершення TTS
- `workflow_stage` - Зміна stage workflow
- `item_status` - Статус TODO item

## TTS Service API

### Base URL
```
http://localhost:3001
```

### POST /synthesize
Синтез мовлення

**Request:**
```json
{
  "text": "string",
  "voice": "dmytro|tetiana|mykyta|lada",
  "speed": "number (optional)",
  "fx_preset": "string (optional)"
}
```

**Response:** audio/wav

### GET /health
Health check

## Whisper Service API

### Base URL
```
http://localhost:3002
```

### POST /transcribe
Транскрибування аудіо

**Request:** multipart/form-data
- `audio`: audio file
- `language`: "uk" (optional)

**Response:**
```json
{
  "status": "success",
  "text": "string",
  "language": "uk",
  "segments": [...]
}
```

### POST /transcribe_blob
Транскрибування аудіо blob

**Request:** binary audio data
**Query params:** ?language=uk

**Response:** Same as /transcribe

### GET /health
Health check

## MCP Protocol (stdio)

MCP сервери комунікують через stdio using JSON-RPC 2.0:

### Initialize
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "atlas-orchestrator",
      "version": "5.0.0"
    }
  },
  "id": 1
}
```

### List Tools
```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

### Call Tool
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  },
  "id": 3
}
```

## Error Codes

- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `503` - Service Unavailable (MCP servers not ready)

## Rate Limits

- Chat requests: 60/minute per session
- Tool calls: 100/minute per MCP server
- TTS synthesis: 30/minute
- Whisper transcription: 20/minute
