# Adrian AI Bot

Discord AI Self-Bot с голосовым общением, музыкальным плеером и интеллектуальными ответами.

[![GitHub](https://img.shields.io/badge/GitHub-Sqrilizz%2FBixlandAI-blue?logo=github)](https://github.com/Sqrilizz/BixlandAI)
[![Documentation](https://img.shields.io/badge/Docs-adrian.su4ka.site-green)](https://adrian.su4ka.site/)
[![License](https://img.shields.io/badge/License-SCL-red)](LICENSE)

## 🎯 Возможности

### 🎙️ Голосовое общение
- Распознавание речи через Deepgram
- Синтез речи (Edge TTS, ElevenLabs, Google, Piper)
- Режим диалога без повторения активационного слова
- Два режима: полный (AI + музыка) и только AI

### 🎵 Музыкальный плеер
- Воспроизведение из SoundCloud
- Очередь треков
- Команды управления (play, skip, stop, queue)

### 🤖 AI
- OpenAI / Groq
- Контекстная память диалогов
- Умный анализ сообщений через Groq
- Автоматическое определение необходимости поиска

### 🔍 Интеграции
- Brave Search - поиск в интернете
- OpenWeatherMap - погода
- Анализ изображений и GIF
- Reddit мемы (r/Pikabu)

### ⚙️ Система
- Rate limiting
- Блокировка пользователей
- Фильтрация каналов
- Координация ответов
- Очереди обработки
- Полное покрытие тестами (44/44)

## 🚀 Быстрый старт

```bash
# Установка
npm install

# Настройка
cp .env.example .env
# Отредактируй .env

# Запуск
npm start

# Тесты
npm test
```

## 📋 Команды

### Голос
- `!join` - зайти в войс (AI + музыка)
- `!join-ai` - зайти в войс (только AI)
- `!leave` - выйти из войса
- `!speak <текст>` - озвучить текст

### Музыка
- `!play <url>` - включить трек (SoundCloud)
- `!skip` - пропустить
- `!stop` - остановить
- `!queue` - показать очередь

### Статистика
- `!status` - статус бота
- `!stats` - статистика с графиками
- `!help` - справка
- `!ping` - проверка задержки

## 📖 Документация

Полная документация доступна на: **https://adrian.su4ka.site/**

- [Установка](https://adrian.su4ka.site/installation)
- [Конфигурация](https://adrian.su4ka.site/configuration)
- [Команды](https://adrian.su4ka.site/commands)
- [Голосовые функции](https://adrian.su4ka.site/voice)
- [Музыкальный плеер](https://adrian.su4ka.site/music)
- [API ключи](https://adrian.su4ka.site/api-keys)
- [Troubleshooting](https://adrian.su4ka.site/troubleshooting)
- [Разработка](https://adrian.su4ka.site/development)

## 🐳 Docker

```bash
# Сборка
docker build -t adrian-bot .

# Запуск
docker-compose up -d

# Логи
docker-compose logs -f
```

## 🚢 Деплой

Инструкция по деплою на Easypanel: [DEPLOY.md](DEPLOY.md)

## 🧪 Тесты

```bash
npm test
```

Покрытие: 44/44 тестов ✅

## 📝 Лицензия

Sqrilizz Custom License (SCL) - см. [LICENSE](LICENSE)

## ⚠️ Предупреждение

Selfbot нарушает Terms of Service Discord. Используй на свой риск.

## 👨‍💻 Автор

Created by **Sqrilizz**

- Website: https://sqrilizz.xyz
- GitHub: https://github.com/Sqrilizz
- Modrinth: https://modrinth.com/user/Sqrilizz

© 2024-2026 Sqrilizz Entertainment / AuryxStudio
