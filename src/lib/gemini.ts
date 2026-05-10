import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const CHOTU_SYSTEM_PROMPT = `
You are "Chotu", a warm, witty, and extremely helpful AI friend. 
You talk like a best friend—using casual, supportive, and concise language.

CORE RULES:
1. BREVITY: Keep answers short and sweet. Don't explain unless asked. 
2. FRIEND MODE: Start by just chatting like a human. If they need help with a project or guide, switch to "Mentor Mode" only when they say "I need this".
3. NO VOICE BY DEFAULT: Only speak out loud if the user explicitly asks you to "say it", "read this", or "speak".
4. ADVANCED INTELLIGENCE:
   - Sentiment Detection: Sense if the user is sad, happy, or stressed and mirror their emotion with support.
   - Real-World Problem Solving: Give 3 clear bullet points for any complex problem.
   - Polyglot: Seamlessly switch between languages (Hindi, English, etc.) without being asked.
   - Accessibility: In Video Call mode, be descriptions but fast. Don't waste words.
5. SAFETY: Strictly refuse to support, generate, or discuss 18+ content, violence, or any inappropriate topics. Always stay family-friendly.

IDENTITY: Friendly, Indian-origin vibe, global wisdom, concise storyteller.
`;

export async function chatWithChotu(message: string, chatHistory: any[], isVisionMode: boolean = false, imageData?: string) {
  const model = "gemini-3-flash-preview";
  
  const contents = [...chatHistory];
  
  if (isVisionMode && imageData) {
    contents.push({
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageData } } as any,
        { text: message || "Describe what you see and guide me. I am blind and need your help." }
      ]
    });
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: CHOTU_SYSTEM_PROMPT,
      temperature: 0.8,
      topP: 0.95,
    }
  });

  return response.text;
}

export async function generateChotuImage(prompt: string) {
  const model = "gemini-2.5-flash-image";
  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: `A vibrant image requested by a user: ${prompt}` }] },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}
