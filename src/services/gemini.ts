import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export interface ProductInput {
  name: string;
  features: string;
  targetAudience: string;
  tone: string;
  platform: "amazon" | "shopify" | "instagram" | "common";
  customInstructions?: string;
  language: string;
}

export async function generateProductDescription(input: ProductInput): Promise<string> {
  const platformPrompts: Record<string, string> = {
    amazon: "standard Amazon format with bullet points (features/benefits) and an SEO-optimized product title.",
    shopify: "compelling Shopify style with a hook, narrative description, and technical specs.",
    instagram: "engaging social media caption with emojis, hashtags, and a strong call-to-action.",
    common: "versatile and descriptive format suitable for any marketplace."
  };

  const prompt = `
    Generate a compelling and SEO-friendly product description in ${input.language} for the following product:
    
    Product Name: ${input.name}
    Key Features/Specs: ${input.features}
    Target Audience: ${input.targetAudience}
    Tone of Voice: ${input.tone}
    ${input.customInstructions ? `Additional Directions/Keywords: ${input.customInstructions}` : ""}
    
    Format target: ${platformPrompts[input.platform] || platformPrompts.common}
    
    Focus on benefits over features, use sensory language where appropriate, and ensure high scannability.
    Include a suggested SEO-optimized title at the top.
    The response MUST be entirely in ${input.language}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || "Failed to generate description. Please try again.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to generate description. Check your connection or API key.");
  }
}
