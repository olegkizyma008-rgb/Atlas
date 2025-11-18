# Agent Messages Not Displaying in Web Chat - Fix (2025-11-19)

## Problem
Agent messages (Tetyana, Grisha, System) were not appearing in the web chat interface, even though they were being sent through WebSocket and logged in the system logs.

### Root Cause
The system had two communication channels:
1. **WebSocket** (`ws://localhost:5102`) - Used for TTS agent messages
2. **SSE (Server-Sent Events)** (`/chat/stream`) - Used for main chat stream

The issue was that:
- Agent messages were ONLY sent via WebSocket
- Web chat was receiving data via SSE stream
- These are two separate channels, and if WebSocket connection was not established or messages were not being received properly, the chat would be empty

### Evidence from Logs
```
14:58:22[TETYANA]Відкрити калькулятор application
14:58:46[TETYANA]Виконано
14:58:46[GRISHA]Підтверджено
14:58:53[TETYANA]Clear Калькулятор input
```

These messages appeared in system logs but NOT in web chat interface.

## Solution
Added SSE fallback delivery for agent messages. Now messages are sent through BOTH channels:

### 1. Modified `tts-sync-manager.js`

**Added SSE fallback delivery** (lines 167-187):
```javascript
// ADDED 2025-11-19: Also send via SSE for fallback delivery
if (res && res.writable && !res.writableEnded) {
    try {
        res.write(`data: ${JSON.stringify({
            type: 'agent_message',
            data: {
                content: phrase,
                agent: agent,
                ttsContent: phrase,
                mode: validMode,
                language: userLanguage,
                messageId: `tts_${Date.now()}`,
                sessionId: sessionId,
                timestamp: new Date().toISOString()
            }
        })}\n\n`);
        this.logger.system('tts-sync', `[TTS-SYNC] ✅ SSE fallback sent`);
    } catch (sseError) {
        this.logger.debug(`[TTS-SYNC] SSE fallback failed (not critical): ${sseError.message}`);
    }
}
```

### 2. Modified `executor-v3.js`

**Added `res` parameter to all `ttsSyncManager.speak()` calls** (3 locations):

**Location 1** (line 1805) - Tetyana START message:
```javascript
await ttsSyncManager.speak(actionForTts, {
    mode: 'normal',
    agent: 'tetyana',
    sessionId: session.id,
    res: res  // ADDED 2025-11-19: Pass SSE response for fallback delivery
});
```

**Location 2** (line 1940) - Tetyana SUCCESS message:
```javascript
await ttsSyncManager.speak(selectedPhrase, {
    mode: 'normal',
    agent: 'tetyana',
    sessionId: session.id,
    res: res  // ADDED 2025-11-19: Pass SSE response for fallback delivery
});
```

**Location 3** (line 1956) - Grisha VERIFY message:
```javascript
await ttsSyncManager.speak(verifyResult.verification.tts_phrase, {
    mode: 'normal',
    agent: 'grisha',
    sessionId: session.id,
    res: res  // ADDED 2025-11-19: Pass SSE response for fallback delivery
});
```

## How It Works Now

### Message Flow
```
Agent (Tetyana/Grisha) generates message
    ↓
ttsSyncManager.speak() called with res object
    ↓
    ├─→ WebSocket broadcast (primary channel)
    │   └─→ wsManager.broadcastToSubscribers('chat', 'agent_message', {...})
    │
    └─→ SSE fallback (backup channel)
        └─→ res.write(JSON.stringify({type: 'agent_message', ...}))
    ↓
Web chat receives message through EITHER channel
    ├─→ If WebSocket connected → shows via WebSocket
    └─→ If WebSocket not available → shows via SSE
```

### Benefits
1. **Redundancy**: Messages are sent through two channels
2. **Reliability**: If one channel fails, the other ensures delivery
3. **Language Support**: Both channels include `language` parameter for TTS
4. **No Duplication**: Frontend can deduplicate using `messageId`

## Testing

### Before Fix
- System logs show messages
- Web chat is empty
- No agent messages visible

### After Fix
- System logs show messages
- Web chat displays all agent messages
- Messages appear in real-time
- Language parameter included for TTS

## Files Modified
1. `/orchestrator/workflow/tts-sync-manager.js` - Added SSE fallback
2. `/orchestrator/workflow/executor-v3.js` - Pass `res` to speak() calls

## Related Previous Fixes (2025-11-19)
- Added `language` parameter to all agent messages
- Fixed language configuration for Ukrainian (uk)
- Added language support to dev-self-analysis-processor
- Added language support to stream-notifier
- Added language support to chat.routes

## Status
✅ **FIXED** - Agent messages now display in web chat with proper language support
