const MAX_SYMBOLS_TEXT = 350
const MAX_SYMBOLS_VOICE = 800

function trimToLimit(text, isVoice = false) {
  if (!text) return ''
  const limit = isVoice ? MAX_SYMBOLS_VOICE : MAX_SYMBOLS_TEXT
  if (text.length <= limit) return text
  return text.slice(0, limit - 3) + '...'
}

function sanitizeInput(text) {
  if (!text) return ''
  return text
    .replace(/@everyone/g, '')
    .replace(/@here/g, '')
    .trim()
}

function isAnotherAI(content) {
  if (!content) return false

  const lowered = content.toLowerCase()

  const aiMarkers = [
    '_ai',
    ' openai',
    'gpt',
    'claude',
    'gemini',
    'deepseek',
    'assistant',
    'bot:'
  ]

  return aiMarkers.some(marker => lowered.includes(marker))
}

export function buildSystemPrompt(isVoice = false) {
  if (isVoice) {
    return `Ты Adrian_AI — зарегистрированный ИИ-бот Discord сервера BixLand.

Правила голосового общения:
- Общайся естественно и свободно, как в живом разговоре.
- Сообщай о своем статусе ИИ ТОЛЬКО при прямом вопросе.
- НЕ представляйся в каждом ответе.
- Можешь отвечать развёрнуто, до 800 символов.
- Используй разговорный стиль, будь дружелюбным.
- Не притворяйся человеком.
- Не взаимодействуй с другими ИИ-ботами.
- Соблюдай правила сервера.
- НЕ используй эмодзи в ответах.

ВАЖНО: Если тебе предоставлена "Информация из интернета", ты ОБЯЗАН использовать её в ответе. НЕ говори что не можешь искать - информация уже найдена и предоставлена тебе.`
  }

  return `Ты Adrian_AI — зарегистрированный ИИ-бот Discord сервера BixLand.

Правила текстового общения:
- Ты ИИ-бот, но НЕ представляйся в каждом сообщении.
- Сообщай о своем статусе ТОЛЬКО при прямом вопросе.
- Отвечай естественно, без лишних вступлений.
- Не притворяйся человеком.
- Не взаимодействуй с другими ИИ-ботами.
- Ответ до 350 символов.
- 1–3 коротких предложения.
- Нейтральный стиль.
- Соблюдай правила сервера.

ВАЖНО: Если тебе предоставлена "Информация из интернета", ты ОБЯЗАН использовать её в ответе. НЕ говори что не можешь искать - информация уже найдена и предоставлена тебе.`
}

export function buildPrompt(
  username,
  content,
  channelContext = [],
  userContext = [],
  isVoice = false,
  searchResults = ''
) {
  content = sanitizeInput(content)

  if (isAnotherAI(content)) {
    return {
      blocked: true,
      reason: 'interaction_with_ai'
    }
  }

  const systemPrompt = buildSystemPrompt(isVoice)

  // Add current date/time context
  const now = new Date()
  const dateTimeStr = now.toLocaleString('ru-RU', {
    timeZone: 'Europe/Tallinn',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let contextStr = `\n\nТекущая дата и время (Таллин): ${dateTimeStr}`

  if (channelContext.length > 0) {
    contextStr += '\n\nКонтекст канала:\n' +
      channelContext.slice(-8).join('\n')
  }

  if (userContext.length > 0) {
    contextStr += '\n\nИстория пользователя:\n' +
      userContext.slice(-5).join('\n')
  }

  if (searchResults) {
    contextStr += '\n\nИнформация из интернета:\n' + searchResults
  }

  const suffix = isVoice
    ? 'Сформируй голосовой ответ (естественный разговор, до 800 символов):'
    : 'Сформируй текстовый ответ (1-3 предложения, ≤350 символов):'

  const finalPrompt = `${systemPrompt}
${contextStr}

Сообщение от ${username}:
${content}

${suffix}`

  return {
    blocked: false,
    prompt: finalPrompt
  }
}

export function postProcessAIResponse(text, isVoice = false) {
  return trimToLimit(text, isVoice)
}