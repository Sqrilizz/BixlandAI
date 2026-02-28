import axios from 'axios';
import sharp from 'sharp';
import { GifUtil } from 'gifwrap';
import { logger } from './logger.js';

export async function extractGifFrames(gifUrl) {
  try {
    logger.debug(`Extracting GIF frames: ${gifUrl}`);

    const response = await axios.get(gifUrl, {
      responseType: 'arraybuffer',
      timeout: 15000
    });

    const gifBuffer = Buffer.from(response.data);
    const gif = await GifUtil.read(gifBuffer);
    
    const totalFrames = gif.frames.length;
    if (totalFrames === 0) {
      throw new Error('No frames in GIF');
    }

    const frameIndices = [
      0,
      1,
      Math.floor(totalFrames / 2) - 1,
      Math.floor(totalFrames / 2),
      totalFrames - 2,
      totalFrames - 1
    ].filter((idx, i, arr) => idx >= 0 && idx < totalFrames && arr.indexOf(idx) === i);

    const frames = [];
    for (const idx of frameIndices) {
      const frame = gif.frames[idx];
      const bitmap = frame.bitmap;
      
      const pngBuffer = await sharp(bitmap.data, {
        raw: {
          width: bitmap.width,
          height: bitmap.height,
          channels: 4
        }
      })
      .png()
      .toBuffer();

      frames.push({
        index: idx,
        base64: pngBuffer.toString('base64')
      });
    }

    logger.success(`✅ Extracted ${frames.length} frames from GIF`);
    return frames;
  } catch (error) {
    logger.error('Failed to extract GIF frames:', error.message);
    throw error;
  }
}

async function createFrameGrid(frames) {
  try {
    const frameBuffers = frames.map(f => Buffer.from(f.base64, 'base64'));
    
    const metadata = await sharp(frameBuffers[0]).metadata();
    const frameWidth = metadata.width;
    const frameHeight = metadata.height;
    
    const cols = 3;
    const rows = 2;
    const gridWidth = frameWidth * cols;
    const gridHeight = frameHeight * rows;
    
    const compositeImages = frames.map((f, i) => ({
      input: Buffer.from(f.base64, 'base64'),
      left: (i % cols) * frameWidth,
      top: Math.floor(i / cols) * frameHeight
    }));
    
    const gridBuffer = await sharp({
      create: {
        width: gridWidth,
        height: gridHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
    .composite(compositeImages)
    .png()
    .toBuffer();
    
    return gridBuffer.toString('base64');
  } catch (error) {
    logger.error('Failed to create frame grid:', error.message);
    throw error;
  }
}

export async function analyzeGif(gifUrl, question = 'Что происходит на этой гифке?') {
  const apiKey = process.env.YELLOWFIRE_API_KEY;
  const model = process.env.MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('YELLOWFIRE_API_KEY not set');
  }

  try {
    logger.debug('Analyzing GIF');

    const frames = await extractGifFrames(gifUrl);
    
    const gridImage = await createFrameGrid(frames);
    
    const prompt = `${question}\n\nЭто гифка, показанная как сетка из ${frames.length} ключевых кадров (слева направо, сверху вниз):\n- Кадры 1-2: начало\n- Кадры 3-4: середина\n- Кадры 5-6: конец\n\nОпиши что происходит на гифке, учитывая последовательность кадров.`;

    const taskResponse = await axios.post('https://yellowfire.ru/api/v2/chatgpt', {
      model: model,
      prompt: prompt,
      chat_history: [],
      internet_access: false,
      file_base64: gridImage,
      mime_type: 'image/png',
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const { request_id, wait } = taskResponse.data;
    logger.debug(`GIF analysis request_id: ${request_id}`);

    await new Promise(resolve => setTimeout(resolve, wait * 1000));

    for (let attempt = 0; attempt < 30; attempt++) {
      const statusResponse = await axios.get(`https://yellowfire.ru/api/v2/status/${request_id}`, {
        headers: {
          'api-key': apiKey,
        },
      });

      const { status, response } = statusResponse.data;

      if (status === 'completed' || status === 'success') {
        logger.success('✅ GIF analyzed');
        return response.text || response;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error('GIF analysis failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('GIF analysis timeout');
  } catch (error) {
    logger.error('GIF analysis error:', error.message);
    throw error;
  }
}

export function isGif(message) {
  const hasGifAttachment = message.attachments.size > 0 && 
    Array.from(message.attachments.values()).some(att => 
      att.contentType === 'image/gif' || 
      att.url?.toLowerCase().endsWith('.gif') ||
      att.name?.toLowerCase().endsWith('.gif')
    );
  
  const hasGifUrl = message.content && (
    message.content.includes('giphy.com/gifs/') ||
    message.content.includes('tenor.com/view/') ||
    /https?:\/\/\S+\.gif/i.test(message.content)
  );
  
  return hasGifAttachment || hasGifUrl;
}

export function getGifUrl(message) {
  const gifAttachment = Array.from(message.attachments.values())
    .find(att => 
      att.contentType === 'image/gif' || 
      att.url?.toLowerCase().endsWith('.gif') ||
      att.name?.toLowerCase().endsWith('.gif')
    );
  
  if (gifAttachment) {
    return gifAttachment.url;
  }
  
  if (message.content) {
    const giphyMatch = message.content.match(/https?:\/\/giphy\.com\/gifs\/[^\s]+/i);
    if (giphyMatch) {
      const giphyId = giphyMatch[0].split('-').pop();
      return `https://i.giphy.com/media/${giphyId}/giphy.gif`;
    }
    
    const tenorMatch = message.content.match(/https?:\/\/tenor\.com\/view\/[^\s]+/i);
    if (tenorMatch) {
      return tenorMatch[0];
    }
    
    const directGifMatch = message.content.match(/https?:\/\/\S+\.gif/i);
    if (directGifMatch) {
      return directGifMatch[0];
    }
  }
  
  return null;
}
