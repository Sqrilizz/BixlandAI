import { spawn } from 'child_process';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate TTS using Piper (local, fast, free)
 * Requires: piper-tts installed
 * Install: pip install piper-tts
 * Or download binary from: https://github.com/rhasspy/piper/releases
 */
export async function generatePiperTTS(text, voiceModel = 'ru_RU-dmitri-medium') {
  return new Promise((resolve, reject) => {
    try {
      logger.debug(`Piper TTS: ${text.slice(0, 30)}...`);
      
      const tempFile = path.join(__dirname, `../../../temp_tts_${Date.now()}.wav`);
      const modelPath = path.join(process.env.HOME, '.local/share/piper/voices', `${voiceModel}.onnx`);
      
      logger.debug(`Piper model path: ${modelPath}`);
      logger.debug(`Piper temp file: ${tempFile}`);
      
      if (!fs.existsSync(modelPath)) {
        reject(new Error(`Piper model not found: ${modelPath}`));
        return;
      }
      
      const piperPath = process.env.PIPER_PATH || '/usr/local/bin/piper';
      const piper = spawn(piperPath, [
        '--model', modelPath,
        '--output_file', tempFile
      ]);

      piper.stdin.write(text);
      piper.stdin.end();

      let stderr = '';
      let stdout = '';

      piper.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.debug(`Piper stderr: ${data.toString()}`);
      });
      
      piper.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.debug(`Piper stdout: ${data.toString()}`);
      });

      piper.on('close', (code) => {
        logger.debug(`Piper exited with code ${code}`);
        
        if (code !== 0) {
          logger.error('Piper TTS failed:', stderr);
          reject(new Error(`Piper exited with code ${code}: ${stderr}`));
          return;
        }

        fs.readFile(tempFile, (err, data) => {
          if (err) {
            logger.error('Failed to read Piper output:', err);
            reject(err);
            return;
          }

          fs.unlink(tempFile, (unlinkErr) => {
            if (unlinkErr) {
              logger.warn('Failed to delete temp file:', unlinkErr);
            }
          });

          logger.success(`✅ Piper TTS generated ${data.length} bytes`);
          resolve(data);
        });
      });

      piper.on('error', (err) => {
        logger.error('Piper spawn error:', err.message);
        reject(new Error('Piper not found. Install: pip install piper-tts'));
      });

    } catch (error) {
      logger.error('Piper TTS error:', error);
      reject(error);
    }
  });
}

/**
 * Check if Piper is installed
 */
export async function checkPiperInstalled() {
  return new Promise((resolve) => {
    const piperPath = process.env.PIPER_PATH || '/usr/local/bin/piper';
    logger.debug(`Checking Piper at: ${piperPath}`);
    
    const piper = spawn(piperPath, ['--version']);
    
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        logger.warn('Piper check timeout');
        resolve(false);
      }
    }, 2000);
    
    piper.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        logger.debug(`Piper check exit code: ${code}`);
        resolve(code === 0);
      }
    });
    
    piper.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        logger.warn(`Piper check error: ${err.message}`);
        resolve(false);
      }
    });
  });
}

/**
 * Download Piper voice model (if needed)
 * Models are auto-downloaded on first use
 */
export async function downloadPiperModel(modelName = 'ru_RU-dmitri-medium') {
  logger.info(`Downloading Piper model: ${modelName}`);
  logger.info('Models are auto-downloaded on first use');
  logger.info('Or download manually from: https://github.com/rhasspy/piper/releases');
}
