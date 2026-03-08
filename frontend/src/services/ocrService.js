// OCR Service
// Uses Google Cloud Vision (more reliable) when API key is available,
// with OCR.Space fallback for environments without a configured key.

import * as FileSystem from 'expo-file-system';

const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image';

const readImageAsBase64 = async (imageUri) => {
  return FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const extractWithGoogleVision = async (base64, apiKey) => {
  const payload = {
    requests: [
      {
        image: {
          content: base64,
        },
        features: [
          {
            type: 'DOCUMENT_TEXT_DETECTION',
            maxResults: 1,
          },
        ],
      },
    ],
  };

  const response = await fetch(`${GOOGLE_VISION_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Google Vision failed with status ${response.status}`);
  }

  const result = await response.json();
  const text = result?.responses?.[0]?.fullTextAnnotation?.text || result?.responses?.[0]?.textAnnotations?.[0]?.description || '';
  return text.trim();
};

const extractWithOcrSpace = async (base64, apiKey = 'helloworld') => {
  const base64Image = `data:image/jpeg;base64,${base64}`;
  const formBody = `apikey=${encodeURIComponent(apiKey)}&language=eng&isOverlayRequired=false&base64Image=${encodeURIComponent(base64Image)}&OCREngine=2`;

  const response = await fetch(OCR_SPACE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  if (!response.ok) {
    throw new Error(`OCR.Space failed with status ${response.status}`);
  }

  const result = await response.json();
  if (result?.ParsedResults?.length > 0) {
    return result.ParsedResults.map((item) => item.ParsedText || '').join(' ').trim();
  }

  return '';
};

export const extractTextFromImage = async (imageUri) => {
  try {
    const base64 = await readImageAsBase64(imageUri);
    const googleVisionKey = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY;

    if (googleVisionKey) {
      try {
        const googleText = await extractWithGoogleVision(base64, googleVisionKey);
        if (googleText) {
          return {
            text: googleText,
            provider: 'google-vision',
          };
        }
      } catch (googleError) {
        console.warn('Google Vision OCR failed, falling back to OCR.Space:', googleError?.message);
      }
    }

    const ocrSpaceKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || 'helloworld';
    const fallbackText = await extractWithOcrSpace(base64, ocrSpaceKey);

    return {
      text: fallbackText,
      provider: 'ocr-space',
    };
  } catch (error) {
    console.error('OCR service error:', error);
    return {
      text: '',
      provider: 'none',
      error: error.message,
    };
  }
};

export default {
  extractTextFromImage,
};
