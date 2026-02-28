/**
 * Normalize text for TTS (convert symbols to words)
 */
export function normalizeForTTS(text) {
  if (!text) return text;
  
  let normalized = text;
  
  normalized = normalized.replace(/(-?\d+)°C/g, (match, num) => {
    const number = parseInt(num);
    if (number < 0) {
      return `минус ${Math.abs(number)} градусов`;
    } else if (number === 1) {
      return `${number} градус`;
    } else if (number >= 2 && number <= 4) {
      return `${number} градуса`;
    } else {
      return `${number} градусов`;
    }
  });
  
  normalized = normalized.replace(/(-?\d+)°/g, (match, num) => {
    const number = parseInt(num);
    if (number < 0) {
      return `минус ${Math.abs(number)} градусов`;
    } else if (number === 1) {
      return `${number} градус`;
    } else if (number >= 2 && number <= 4) {
      return `${number} градуса`;
    } else {
      return `${number} градусов`;
    }
  });
  
  normalized = normalized.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  normalized = normalized.replace(/(\d+)%/g, '$1 процентов');
  
  normalized = normalized.replace(/\$(\d+)/g, '$1 долларов');
  normalized = normalized.replace(/(\d+)\$/g, '$1 долларов');
  
  normalized = normalized.replace(/€(\d+)/g, '$1 евро');
  normalized = normalized.replace(/(\d+)€/g, '$1 евро');
  
  normalized = normalized.replace(/₽(\d+)/g, '$1 рублей');
  normalized = normalized.replace(/(\d+)₽/g, '$1 рублей');
  
  normalized = normalized.replace(/(\d{1,2}):(\d{2})/g, '$1 $2');
  normalized = normalized.replace(/(\d+)\s*м\/с/g, '$1 метров в секунду');
  normalized = normalized.replace(/(\d+)\s*км\/ч/g, '$1 километров в час');
  normalized = normalized.replace(/(\d+)м\b/g, '$1 метров');
  normalized = normalized.replace(/(\d+)км\b/g, '$1 километров');
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}
