import axios from 'axios';
import { logger } from './logger.js';

export async function analyzeImage(imageUrl, question = 'Что на этой картинке?') {
  const apiKey = process.env.YELLOWFIRE_API_KEY;
  const model = process.env.MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('YELLOWFIRE_API_KEY not set');
  }

  try {
    logger.debug(`Analyzing image: ${imageUrl}`);

    const imageBuffer = await downloadImage(imageUrl);
    const base64Image = imageBuffer.toString('base64');

    const taskResponse = await axios.post('https://yellowfire.ru/api/v2/chatgpt', {
      model: model,
      prompt: question,
      chat_history: [],
      internet_access: false,
      file_base64: base64Image,
      mime_type: 'image/jpeg',
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const { request_id, wait } = taskResponse.data;
    logger.debug(`Image analysis request_id: ${request_id}`);

    await new Promise(resolve => setTimeout(resolve, wait * 1000));

    for (let attempt = 0; attempt < 30; attempt++) {
      const statusResponse = await axios.get(`https://yellowfire.ru/api/v2/status/${request_id}`, {
        headers: {
          'api-key': apiKey,
        },
      });

      const { status, response } = statusResponse.data;

      if (status === 'completed' || status === 'success') {
        logger.success('✅ Image analyzed');
        return response.text || response;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error('Image analysis failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Image analysis timeout');
  } catch (error) {
    logger.error('Image analysis error:', error.message);
    throw error;
  }
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return Buffer.from(response.data);
  } catch (error) {
    logger.error('Failed to download image:', error.message);
    throw error;
  }
}

export function hasImage(message) {
  return message.attachments.size > 0 && 
         Array.from(message.attachments.values()).some(att => 
           att.contentType?.startsWith('image/') && att.contentType !== 'image/gif'
         );
}

export function getImageUrl(message) {
  const imageAttachment = Array.from(message.attachments.values())
    .find(att => att.contentType?.startsWith('image/') && att.contentType !== 'image/gif');
  return imageAttachment?.url || null;
}
