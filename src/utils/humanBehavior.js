const emojis = ['💀','🔥','🗿','😏','🥶','🫡','👀','⚡'];

export async function addReaction(message) {
  if (Math.random() > 0.15) return;
  
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  try {
    await message.react(emoji);
  } catch (error) {
  }
}

export async function simulateTyping(channel) {
  const duration = 1000 + Math.random() * 2000;
  
  channel.sendTyping();
  
  await new Promise(resolve => setTimeout(resolve, duration));
}

export function randomDelay() {
  return new Promise(resolve => {
    const delay = 500 + Math.random() * 1500;
    setTimeout(resolve, delay);
  });
}
