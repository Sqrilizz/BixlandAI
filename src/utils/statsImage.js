import axios from 'axios';
import sharp from 'sharp';

async function imageToBase64(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return `data:image/png;base64,${Buffer.from(res.data).toString('base64')}`;
  } catch {
    return null;
  }
}

export async function generateStatsImage(stats) {
  const {
    messagesUsed,
    maxMessages,
    topUsers = [],
    textQueueSize = 0,
    voiceQueueSize = 0,
    ttsQueueSize = 0,
    messageHistory = [],
    botAvatarUrl,
    botUsername
  } = stats;

  const WIDTH = 1200;
  const HEIGHT = 520;

  const PADDING = 40;
  const GAP = 40;

  const LEFT_WIDTH = 360;
  const RIGHT_X = PADDING + LEFT_WIDTH + GAP;
  const RIGHT_WIDTH = WIDTH - RIGHT_X - PADDING;

  const percent = maxMessages > 0 ? messagesUsed / maxMessages : 0;
  const percentage = Math.round(percent * 100);
  const progressWidth = Math.round(percent * 280);

  const avatar = botAvatarUrl ? await imageToBase64(botAvatarUrl) : null;

  const BG = "#0f1115";
  const CARD = "#171a21";
  const SOFT = "#21262d";
  const TEXT = "#e6edf3";
  const MUTED = "#8b949e";
  const ACCENT = "#8ab4f8";

  let graphLine = "";
  let graphFill = "";
  let graphPoints = "";

  if (messageHistory.length > 1) {
    const maxCount = Math.max(...messageHistory.map(p => p.count), 1);
    const stepX = RIGHT_WIDTH - 60;
    const offset = stepX / (messageHistory.length - 1);

    messageHistory.forEach((p, i) => {
      const x = RIGHT_X + 30 + i * offset;
      const y = 120 - (p.count / maxCount) * 80 + 80;

      if (i === 0) {
        graphLine = `M ${x} ${y}`;
        graphFill = `M ${x} ${y}`;
      } else {
        graphLine += ` L ${x} ${y}`;
        graphFill += ` L ${x} ${y}`;
      }

      graphPoints += `<circle cx="${x}" cy="${y}" r="3" fill="${ACCENT}" />`;
    });

    graphFill += ` L ${RIGHT_X + RIGHT_WIDTH - 30} 200 L ${RIGHT_X + 30} 200 Z`;
  }

  const maxUser = topUsers.length ? topUsers[0].count : 1;
  let usersHTML = "";

  topUsers.slice(0, 5).forEach((u, i) => {
    const y = 300 + i * 42;
    const bar = Math.round((u.count / maxUser) * (RIGHT_WIDTH - 220));

    usersHTML += `
      <text x="${RIGHT_X + 30}" y="${y}" fill="${TEXT}" font-size="14">
        ${i + 1}. ${u.username.slice(0, 18)}
      </text>

      <rect 
        x="${RIGHT_X + 200}" 
        y="${y - 12}" 
        width="${RIGHT_WIDTH - 260}" 
        height="16" 
        rx="8" 
        fill="${SOFT}" 
      />

      <rect 
        x="${RIGHT_X + 200}" 
        y="${y - 12}" 
        width="${bar}" 
        height="16" 
        rx="8" 
        fill="${ACCENT}" 
      />

      <text 
        x="${RIGHT_X + RIGHT_WIDTH - 30}" 
        y="${y}" 
        fill="${ACCENT}" 
        font-size="13" 
        text-anchor="end"
      >
        ${u.count}
      </text>
    `;
  });

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .title { font: 600 22px Inter, Arial; fill: ${TEXT}; }
      .muted { font: 13px Inter, Arial; fill: ${MUTED}; }
      .value { font: 600 18px Inter, Arial; fill: ${ACCENT}; }
      .big { font: 700 40px Inter, Arial; fill: ${ACCENT}; }
    </style>

    <rect width="100%" height="100%" fill="${BG}" />

    <rect x="${PADDING}" y="40" width="${LEFT_WIDTH}" height="110" rx="14" fill="${CARD}" />
    ${
      avatar
        ? `<image href="${avatar}" x="${PADDING + 20}" y="60" width="60" height="60" />`
        : `<rect x="${PADDING + 20}" y="60" width="60" height="60" rx="12" fill="${SOFT}" />`
    }

    <text x="${PADDING + 100}" y="80" class="title">
      ${botUsername || "Bot_AI"}
    </text>
    <text x="${PADDING + 100}" y="100" class="muted">
      Statistics Overview
    </text>

    <rect x="${PADDING}" y="170" width="${LEFT_WIDTH}" height="170" rx="14" fill="${CARD}" />
    <text x="${PADDING + 20}" y="200" class="muted">Daily Usage</text>

    <rect 
      x="${PADDING + 20}" 
      y="220" 
      width="280" 
      height="22" 
      rx="11" 
      fill="${SOFT}" 
    />
    <rect 
      x="${PADDING + 20}" 
      y="220" 
      width="${progressWidth}" 
      height="22" 
      rx="11" 
      fill="${ACCENT}" 
    />

    <text x="${PADDING + 20}" y="290" class="big">${percentage}%</text>
    <text x="${PADDING + 20}" y="320" class="value">
      ${messagesUsed} / ${maxMessages}
    </text>

    ${["Text", "Voice", "TTS"].map((label, i) => {
      const x = PADDING + i * (LEFT_WIDTH / 3);
      const value = [textQueueSize, voiceQueueSize, ttsQueueSize][i];

      return `
        <rect 
          x="${x}" 
          y="360" 
          width="${LEFT_WIDTH / 3 - 10}" 
          height="90" 
          rx="12" 
          fill="${CARD}" 
        />
        <text 
          x="${x + (LEFT_WIDTH / 3 - 10) / 2}" 
          y="390" 
          text-anchor="middle" 
          class="muted"
        >
          ${label}
        </text>
        <text 
          x="${x + (LEFT_WIDTH / 3 - 10) / 2}" 
          y="420" 
          text-anchor="middle" 
          class="value"
        >
          ${value}
        </text>
      `;
    }).join("")}

    <rect x="${RIGHT_X}" y="40" width="${RIGHT_WIDTH}" height="200" rx="14" fill="${CARD}" />
    <text x="${RIGHT_X + 20}" y="70" class="muted">Activity (24h)</text>

    <path d="${graphFill}" fill="${ACCENT}" opacity="0.08" />
    <path d="${graphLine}" stroke="${ACCENT}" stroke-width="2.5" fill="none" />
    ${graphPoints}

    <rect 
      x="${RIGHT_X}" 
      y="260" 
      width="${RIGHT_WIDTH}" 
      height="${topUsers.length * 42 + 60}" 
      rx="14" 
      fill="${CARD}" 
    />

    <text x="${RIGHT_X + 20}" y="290" class="muted">
      Top Users
    </text>

    ${usersHTML}

    <text 
      x="${WIDTH / 2}" 
      y="${HEIGHT - 20}" 
      text-anchor="middle" 
      class="muted"
    >
      AdrianAI • Sqrilizz Entertainment
    </text>

  </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}