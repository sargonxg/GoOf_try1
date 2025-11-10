import { GoogleGenAI, Type } from "@google/genai";
import { Document, SummaryData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateContentWithRetries = async (params: any, retries = 3) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await ai.models.generateContent(params);
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        console.error("Gemini API call failed after multiple retries:", error);
        throw error;
      }
      console.warn(`Gemini API call failed, retrying... (Attempt ${attempt})`, error);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error("Gemini API call failed after all retries.");
};


const buildContextPrompt = (documents: Document[]): string => {
  return documents
    .map(doc => `--- DOCUMENT START: ${doc.name} ---\n${doc.content}\n--- DOCUMENT END: ${doc.name} ---`)
    .join('\n\n');
};

const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        answer: {
            type: Type.STRING,
            description: "The detailed answer to the user's question, synthesized from the provided documents. If the answer cannot be found, this field should explain that."
        },
        sources: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of document names (e.g., ['doc1.pdf', 'doc2.txt']) that were used as sources for the answer. This should be empty if the answer is not from the documents."
        },
        isFromDocuments: {
            type: Type.BOOLEAN,
            description: "A boolean flag indicating if the core information for the answer was found within the provided documents."
        }
    },
    required: ["answer", "sources", "isFromDocuments"]
};

export const getChatResponse = async (query: string, documents: Document[]) => {
  const documentContext = buildContextPrompt(documents);
  const systemInstruction = `You are an expert AI assistant specializing in analyzing documents related to the UN Good Offices of the Secretary-General. You have been provided with the content of several documents. Your task is to answer the user's question based *only* on the information contained within these documents.

When you formulate your answer, you MUST follow these rules:
1. Synthesize information from the provided documents to give a comprehensive answer.
2. If the answer is found in the documents, you MUST cite the name of the source document(s) in the 'sources' array.
3. If the information is not available in the documents, explicitly state that the answer cannot be found in the provided materials in the 'answer' field and set 'isFromDocuments' to false. Do not use external knowledge.
4. Your entire response must be a single JSON object matching the provided schema. Do not add any text or markdown formatting outside of the JSON object.`;

  const prompt = `${documentContext}\n\nUser's Question: "${query}"\n\nJSON Response:`;

  const response = await generateContentWithRetries({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: chatResponseSchema,
        temperature: 0.2,
    }
  });

  const text = response.text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Gemini JSON response:", text);
    return {
        answer: "Sorry, I received an invalid response from the AI. Please try again.",
        sources: [],
        isFromDocuments: false
    };
  }
};

const summaryResponseSchema = {
    type: Type.OBJECT,
    properties: {
        summaryText: {
            type: Type.STRING,
            description: "A concise but comprehensive summary of the key themes, findings, and conclusions across all the provided documents, formatted in Markdown."
        },
        countries: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An alphabetized array of all countries mentioned in the documents."
        },
        stakeholders: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of key stakeholders (e.g., organizations, individuals, groups) mentioned in the documents."
        }
    },
    required: ["summaryText", "countries", "stakeholders"]
};

export const getSummary = async (documents: Document[]): Promise<SummaryData> => {
    const documentContext = buildContextPrompt(documents);
    const systemInstruction = `You are an expert AI assistant. You have been provided with several documents related to the UN Good Offices of the Secretary-General. Your task is to generate a summary and extract key entities. You must identify all countries and key stakeholders mentioned. Your entire response must be a single JSON object matching the provided schema.`;

    const prompt = `Please provide a summary, a list of countries, and a list of stakeholders for the following documents:\n\n${documentContext}`;

    const response = await generateContentWithRetries({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: summaryResponseSchema
        }
    });

    const text = response.text.trim();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse Gemini JSON summary response:", text);
        return {
            summaryText: "Sorry, I received an invalid response from the AI while generating the summary. Please try again.",
            countries: [],
            stakeholders: []
        };
    }
};

export const getDocumentDescription = async (content: string): Promise<string> => {
    // Truncate content to avoid exceeding token limits for a simple description
    const truncatedContent = content.substring(0, 8000);
    const prompt = `Briefly describe the purpose or main topic of the following document in a single, concise sentence.\n\nDOCUMENT CONTENT:\n${truncatedContent}`;
    
    const response = await generateContentWithRetries({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1,
            maxOutputTokens: 100,
            // FIX: Added thinkingConfig to reserve tokens for the output when using maxOutputTokens with gemini-2.5-flash.
            thinkingConfig: { thinkingBudget: 50 },
        }
    });

    return response.text.trim();
};
