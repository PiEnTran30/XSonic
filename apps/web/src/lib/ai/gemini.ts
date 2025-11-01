import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

/**
 * Transcribe audio to text with timestamps
 * Used for Auto Subtitle feature
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString("base64"),
        },
      },
      `Transcribe this audio to text with timestamps. 
      Format the response as JSON with this structure:
      {
        "text": "full transcription",
        "segments": [
          {"start": 0.0, "end": 2.5, "text": "first segment"},
          {"start": 2.5, "end": 5.0, "text": "second segment"}
        ]
      }`,
    ]);

    const responseText = result.response.text();
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      // Fallback if not JSON
      return {
        text: responseText,
        segments: [{ start: 0, end: 0, text: responseText }],
      };
    }
  } catch (error: any) {
    console.error("Gemini transcription error:", error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Generate speech from text
 * Used for Text-to-Speech feature
 */
export async function textToSpeech(text: string, voice: string = "default"): Promise<{
  audioUrl: string;
  duration: number;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      `Generate audio speech for this text: "${text}". 
      Voice style: ${voice}.
      Return the audio data as base64.`,
    ]);

    const responseText = result.response.text();

    // Note: Gemini doesn't directly generate audio yet
    // This is a placeholder - you might need to use Google Cloud TTS API instead
    return {
      audioUrl: responseText,
      duration: 0,
    };
  } catch (error: any) {
    console.error("Gemini TTS error:", error);
    throw new Error(`Text-to-speech failed: ${error.message}`);
  }
}

/**
 * Analyze audio and suggest enhancements
 * Used for Audio Enhance feature
 */
export async function analyzeAudio(audioBuffer: Buffer, mimeType: string): Promise<{
  analysis: string;
  suggestions: string[];
  enhancementParams: {
    noise_reduction: number;
    bass_boost: number;
    treble_boost: number;
    compression: number;
  };
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString("base64"),
        },
      },
      `Analyze this audio file and provide:
      1. Overall quality assessment
      2. Specific issues (noise, clipping, low volume, etc.)
      3. Enhancement suggestions
      4. Recommended parameters for noise reduction, bass boost, treble boost, and compression (0-100 scale)
      
      Format as JSON:
      {
        "analysis": "overall assessment",
        "suggestions": ["suggestion 1", "suggestion 2"],
        "enhancementParams": {
          "noise_reduction": 50,
          "bass_boost": 20,
          "treble_boost": 10,
          "compression": 30
        }
      }`,
    ]);

    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      return {
        analysis: responseText,
        suggestions: [],
        enhancementParams: {
          noise_reduction: 0,
          bass_boost: 0,
          treble_boost: 0,
          compression: 0,
        },
      };
    }
  } catch (error: any) {
    console.error("Gemini audio analysis error:", error);
    throw new Error(`Audio analysis failed: ${error.message}`);
  }
}

/**
 * Separate audio stems (vocals, drums, bass, other)
 * Used for Stem Splitter feature
 */
export async function analyzeStemSeparation(audioBuffer: Buffer, mimeType: string): Promise<{
  hasVocals: boolean;
  hasDrums: boolean;
  hasBass: boolean;
  complexity: "simple" | "moderate" | "complex";
  recommendations: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString("base64"),
        },
      },
      `Analyze this audio and determine:
      1. Does it contain vocals?
      2. Does it contain drums?
      3. Does it contain bass?
      4. Overall complexity (simple/moderate/complex)
      5. Recommendations for stem separation
      
      Format as JSON:
      {
        "hasVocals": true,
        "hasDrums": true,
        "hasBass": true,
        "complexity": "moderate",
        "recommendations": ["recommendation 1", "recommendation 2"]
      }`,
    ]);

    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      return {
        hasVocals: false,
        hasDrums: false,
        hasBass: false,
        complexity: "simple",
        recommendations: [],
      };
    }
  } catch (error: any) {
    console.error("Gemini stem analysis error:", error);
    throw new Error(`Stem analysis failed: ${error.message}`);
  }
}

/**
 * Detect and analyze reverb in audio
 * Used for De-Reverb feature
 */
export async function analyzeReverb(audioBuffer: Buffer, mimeType: string): Promise<{
  hasReverb: boolean;
  reverbLevel: number; // 0-100
  reverbType: string;
  suggestions: string[];
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: audioBuffer.toString("base64"),
        },
      },
      `Analyze this audio for reverb:
      1. Does it have reverb?
      2. Reverb level (0-100)
      3. Type of reverb (room, hall, plate, etc.)
      4. Suggestions for de-reverb processing
      
      Format as JSON:
      {
        "hasReverb": true,
        "reverbLevel": 60,
        "reverbType": "room",
        "suggestions": ["suggestion 1", "suggestion 2"]
      }`,
    ]);

    const responseText = result.response.text();

    try {
      const parsed = JSON.parse(responseText);
      return parsed;
    } catch {
      return {
        hasReverb: false,
        reverbLevel: 0,
        reverbType: "none",
        suggestions: [],
      };
    }
  } catch (error: any) {
    console.error("Gemini reverb analysis error:", error);
    throw new Error(`Reverb analysis failed: ${error.message}`);
  }
}

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GOOGLE_AI_API_KEY;
}

