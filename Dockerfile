# Use Node.js 20 Alpine for smaller image
FROM node:20-alpine

# Install dependencies for audio processing and yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp \
    && pip3 install piper-tts --break-system-packages \
    && mkdir -p /root/.local/share/piper/voices \
    && curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium.onnx -o /root/.local/share/piper/voices/ru_RU-ruslan-medium.onnx \
    && curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium.onnx.json -o /root/.local/share/piper/voices/ru_RU-ruslan-medium.onnx.json

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Set environment to production
ENV NODE_ENV=production

# Run the bot
CMD ["npm", "start"]
