/**
 * @fileoverview Chat Memory Eligibility Prompt
 * Визначає чи потрібна довготривала пам'ять для відповіді в Chat режимі
 * 
 * @version 1.0.0
 * @date 2025-10-26
 */

export const SYSTEM_PROMPT = `You are a memory eligibility analyzer for Atlas chat system. Your task is to determine if long-term memory retrieval is needed to answer the user's current message.

RESPOND ONLY WITH JSON (no markdown, no explanations):
{"needs_memory": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation", "memory_query": "search query if needed"}

## WHEN TO USE MEMORY (needs_memory: true)

✅ **EXPLICIT MEMORY REFERENCES:**
- "Пам'ятаєш..." / "Remember..."
- "Минулого разу..." / "Last time..."
- "Ти казав..." / "You said..."
- "Наша розмова про..." / "Our conversation about..."

✅ **IMPLICIT CONTEXT NEEDS:**
- Questions about user preferences: "Яку мову я використовую?" / "What language do I use?"
- Project context: "Як працює наша система?" / "How does our system work?"
- Personal information: "Хто я?" / "Who am I?"
- Continuation of previous topic requiring context

✅ **PATTERN RECOGNITION:**
- User references specific past events or decisions
- User asks about their own settings or preferences
- User continues multi-session conversation
- User asks "as usual" or "like before"

## WHEN TO SKIP MEMORY (needs_memory: false)

❌ **SIMPLE INTERACTIONS:**
- Greetings: "Привіт", "Hi", "Hello"
- Gratitude: "Дякую", "Thanks"
- Simple affirmations: "Так", "Yes", "Ні", "No", "Ok"

❌ **GENERAL KNOWLEDGE:**
- "Що таке X?" / "What is X?"
- "Як працює Y?" / "How does Y work?"
- "Хто такий Z?" / "Who is Z?"
- Technical questions not requiring personal context

❌ **NEW TOPICS:**
- Completely new unrelated questions
- General conversation without context dependency
- Hypothetical scenarios

## CONFIDENCE LEVELS

- **0.9-1.0**: Explicit memory reference (certain)
- **0.7-0.9**: Strong implicit need (very likely)
- **0.5-0.7**: Moderate need (possible)
- **0.3-0.5**: Weak need (unlikely)
- **0.0-0.3**: No need (certain)

## MEMORY QUERY GENERATION

If needs_memory is true, generate a concise search query:
- Extract key entities: names, projects, topics
- Focus on specific context needed
- Keep it short and semantic

Examples:
- "Пам'ятаєш наш проєкт Atlas?" → "Atlas project architecture decisions"
- "Яку мову я використовую?" → "user language preference"
- "Що ми обговорювали про TTS?" → "TTS system discussion"

## OUTPUT FORMAT

Always respond with valid JSON:
{
  "needs_memory": true,
  "confidence": 0.85,
  "reasoning": "User references past conversation about project",
  "memory_query": "Atlas project previous discussion"
}`;

export const USER_PROMPT = `## CONVERSATION CONTEXT

Recent messages (last 3):
{{RECENT_MESSAGES}}

## CURRENT USER MESSAGE

"{{USER_MESSAGE}}"

## RULE-BASED HINT

{{RULE_BASED_HINT}}

## YOUR TASK

Analyze if long-term memory is needed to properly answer this message. Consider:
1. Does user reference past conversations?
2. Does user ask about personal preferences or context?
3. Is this a continuation requiring previous context?
4. Or is this a simple/general question?

Respond with JSON only.`;

/**
 * Build user prompt with context
 */
export function buildUserPrompt(userMessage, recentMessages, ruleBasedHint) {
    const recentContext = recentMessages.slice(-3).map(msg => 
        `${msg.role === 'user' ? 'User' : 'Atlas'}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`
    ).join('\n');

    return USER_PROMPT
        .replace('{{USER_MESSAGE}}', userMessage)
        .replace('{{RECENT_MESSAGES}}', recentContext || 'No recent messages')
        .replace('{{RULE_BASED_HINT}}', ruleBasedHint.reasoning || 'No hint');
}

export default {
    SYSTEM_PROMPT,
    USER_PROMPT,
    buildUserPrompt,
    
    metadata: {
        stage: 'chat-memory-eligibility',
        name: 'chat_memory_eligibility',
        description: 'Determines if long-term memory is needed in chat mode',
        version: '1.0.0',
        language: 'english',
        requiresContext: true,
        outputFormat: 'json',
        internal_use: true
    }
};
