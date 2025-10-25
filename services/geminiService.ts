import { GoogleGenAI, Modality } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

/**
 * Generates a transformed image using the Gemini API.
 * 
 * @param base64Image The base64 encoded string of the source image.
 * @param mimeType The MIME type of the source image.
 * @param prompt The text prompt to guide the image transformation.
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export const generateTransformation = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        // Must be an array with a single `Modality.IMAGE` element.
        responseModalities: [Modality.IMAGE],
      },
    });

    // Find the first part with image data in the response
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }

    throw new Error('No image data found in the API response.');
  } catch (error) {
    console.error('Error generating image with Gemini API:', error);
    // Provide a more user-friendly error message
    if (error instanceof Error && error.message.includes('deadline')) {
        throw new Error('The request timed out. Please try again.');
    }
    if (error instanceof Error && error.message.includes('safety')) {
        throw new Error('The request was blocked due to safety settings. Please try a different image or prompt.');
    }
    throw new Error('Failed to generate the transformed image.');
  }
};
