# Tests

Тесты для Discord AI Self-Bot

## Запуск

```bash
npm test
```

## Структура

- `tests/ai/` - тесты для AI модулей (promptBuilder)
- `tests/utils/` - тесты для утилит (messageAnalyzer, musicPlayer, filters, rateLimiter, memesAPI)

## Покрытие

### AI модули
- ✅ promptBuilder - построение промптов для AI
- ✅ sanitizeInput - очистка входных данных
- ✅ isAnotherAI - определение AI ботов

### Утилиты
- ✅ messageAnalyzer - анализ типа сообщений, тональности, определение необходимости поиска
- ✅ musicPlayer - форматирование времени, управление очередью музыки
- ✅ filters - определение необходимости ответа на сообщение
- ✅ rateLimiter - ограничение частоты сообщений
- ✅ memesAPI - определение запросов на мемы

## Статистика

- Всего тестов: 44
- Пройдено: 44
- Провалено: 0
- Тестовых наборов: 16
