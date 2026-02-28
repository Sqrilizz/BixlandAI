# Деплой на Easypanel

## Подготовка

1. Залей код на GitHub
2. Зайди в Easypanel
3. Создай новый проект

## Настройка в Easypanel

### 1. Создай приложение

- Type: **App**
- Source: **GitHub Repository**
- Repository: выбери свой репозиторий
- Branch: `main`

### 2. Build Settings

- Build Type: **Dockerfile**
- Dockerfile Path: `Dockerfile`

### 3. Environment Variables

Добавь все переменные из `.env`:

```
DISCORD_TOKEN=твой_токен
YELLOWFIRE_API_KEY=твой_ключ
MODEL=gpt-4o
MAX_MESSAGES_PER_DAY=70
MAX_CHARS=350
MEME_ENABLED=true
RANDOM_CHAT_CHANCE=0.07
ALLOWED_CHANNELS=id1,id2,id3
BLOCKED_USERS=id1,id2
COMMAND_PREFIX=AI!
DEEPGRAM_API_KEY=твой_ключ
ELEVENLABS_API_KEY=твой_ключ
BRAVE_API_KEY=твой_ключ
OPENWEATHER_API_KEY=твой_ключ
GROQ_API_KEY=ключ1,ключ2,ключ3
VOICE_MODE=voice_only
VOICE_ENABLED=true
TTS_PROVIDER=piper
TTS_VOICE=onwK4e9ZLuTAKqWW03F9
PIPER_VOICE=ru_RU-ruslan-medium
GOOGLE_TTS_API_KEY=твой_ключ
GOOGLE_TTS_VOICE=ru-RU-Wavenet-B
EDGE_TTS_VOICE=ru-RU-DmitryNeural
TTS_SPEED=1.0
```

### 4. Deploy

Нажми **Deploy** и жди пока соберется образ.

## Локальное тестирование Docker

```bash
# Собрать образ
docker build -t adrian-bot .

# Запустить
docker-compose up -d

# Посмотреть логи
docker-compose logs -f

# Остановить
docker-compose down
```

## Команды управления в Easypanel

- **Restart** - перезапустить бот
- **Logs** - посмотреть логи
- **Shell** - открыть терминал в контейнере

## Обновление

1. Запуш изменения в GitHub
2. В Easypanel нажми **Redeploy**
3. Бот автоматически пересоберется и перезапустится

## Troubleshooting

### Бот не запускается

Проверь логи в Easypanel:
```
[ERROR] Failed to login
```
→ Проверь `DISCORD_TOKEN`

### Нет голоса

```
[ERROR] DEEPGRAM_API_KEY not set
```
→ Добавь `DEEPGRAM_API_KEY` в Environment Variables

### Музыка не работает

Проверь что yt-dlp установлен:
```bash
# В Shell контейнера
yt-dlp --version
```

## Мониторинг

Easypanel показывает:
- CPU usage
- Memory usage
- Restart count
- Logs

## Backup

Easypanel автоматически делает backup:
- Environment variables
- Deployment settings

Код хранится в GitHub.
