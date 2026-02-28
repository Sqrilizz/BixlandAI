const slangWords = ['хз', 'кст', 'норм', 'щас', 'чё', 'ваще', 'типо', 'короч'];
const typos = {
  'что': 'чо',
  'вообще': 'ваще',
  'сейчас': 'щас',
  'кстати': 'кст',
  'нормально': 'норм',
};

export function enhanceResponse(text, isVoice = false) {
  let enhanced = text;

  enhanced = enhanced.replace(/безусловно,?\s*/gi, '');
  enhanced = enhanced.replace(/разумеется,?\s*/gi, '');
  enhanced = enhanced.replace(/конечно же,?\s*/gi, '');

  if (Math.random() < 0.1) {
    for (const [correct, typo] of Object.entries(typos)) {
      if (enhanced.toLowerCase().includes(correct)) {
        enhanced = enhanced.replace(new RegExp(correct, 'gi'), typo);
        break;
      }
    }
  }

  const maxLength = isVoice ? 600 : 350;
  if (enhanced.length > maxLength) {
    enhanced = enhanced.substring(0, maxLength - 3) + '...';
  }

  return enhanced;
}
