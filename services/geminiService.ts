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

const documentSelectorSchema = {
    type: Type.OBJECT,
    properties: {
        relevant_documents: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of document names that are most likely to contain the answer to the user's question. Select all relevant documents, up to a maximum of 30."
        }
    },
    required: ["relevant_documents"]
};

/**
 * Step 1: Retrieval
 * Analyzes the user's query and the list of available document names to identify the most relevant ones.
 */
export const findRelevantDocuments = async (query: string, documents: Document[]): Promise<Document[]> => {
    // If there are 7 or fewer documents, no need for complex retrieval, just use all of them.
    if (documents.length <= 7) {
        return documents;
    }

    const documentInfos = documents.map(d => 
        `- Name: ${d.name}\n  Description: ${d.description && d.description !== '...' && d.description !== 'Failed to load description.' ? d.description : 'A description is not available for this document.'}`
    ).join('\n');
    
    const systemInstruction = `You are an intelligent document routing assistant. Your task is to identify which document(s) from a list are most relevant to a user's question, using their names and detailed descriptions. Your goal is to select all documents (up to 30) that are likely to contain relevant information. Respond only with a single JSON object matching the provided schema.`;

    const prompt = `User Question: "${query}"\n\nAvailable Documents:\n${documentInfos}\n\nBased on the user's question and the document descriptions, which documents are most likely to contain the answer?`;

    const response = await generateContentWithRetries({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: documentSelectorSchema,
        }
    });

    try {
        const responseObject = JSON.parse(response.text);
        const relevantNames: string[] = responseObject.relevant_documents || [];
        return documents.filter(doc => relevantNames.includes(doc.name));
    } catch (e) {
        console.error("Failed to parse document selector response:", response.text);
        return [];
    }
}

/**
 * Step 2: Map (Extraction)
 * For a single document, extracts key points relevant to the user's query.
 */
export const extractKeyPointsFromDocument = async (query: string, document: Document): Promise<{ extractedPoints: string; document: Document }> => {
    const systemInstruction = `You are a highly efficient text analysis AI. Your task is to extract key points, facts, and direct quotes from a document that are strictly relevant to the user's question. Present these as a concise list of bullet points. If the document contains no relevant information, respond with an empty string.`;
    
    // Truncate content to a reasonable size for this focused task
    const truncatedContent = document.content.substring(0, 25000);

    const prompt = `User Question: "${query}"\n\nDOCUMENT NAME: "${document.name}"\n\nDOCUMENT CONTENT:\n${truncatedContent}\n\nPlease extract the key points from "${document.name}" that are relevant to the user's question.`;

    const response = await generateContentWithRetries({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            temperature: 0.0,
            maxOutputTokens: 1000,
            thinkingConfig: { thinkingBudget: 200 },
        }
    });
    
    const points = response.text.trim();
    
    return { extractedPoints: points, document };
};


const chatResponseSchema = {
    type: Type.OBJECT,
    properties: {
        answer: {
            type: Type.STRING,
            description: "The detailed answer to the user's question, synthesized from the provided key points. This answer MUST include inline citations."
        },
        sources: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of unique document names (filenames) that were actually used as sources for the answer, extracted from the provided key points."
        }
    },
    required: ["answer", "sources"]
};

/**
 * Step 3: Reduce (Synthesis)
 * Uses the extracted key points from multiple documents to generate a final, comprehensive answer with citations.
 */
export const synthesizeFinalAnswer = async (query: string, keyPoints: { extractedPoints: string, document: Document }[]) => {
    const systemInstruction = `You are an expert AI assistant specializing in analyzing UN-related documents. You have been provided with key points extracted from several source documents. Your task is to synthesize these points into a single, comprehensive, and well-structured answer to the user's question.

When you formulate your answer, you MUST follow these critical rules:
1.  Base your answer *only* on the information contained in the provided key points. Do not use external knowledge.
2.  Construct a detailed response in Markdown format in the 'answer' field.
3.  **Crucially, you MUST provide inline citations.** When you use information from a document, cite it immediately using the format: **(Title of Document, Filename, Date)**. For example: "The resolution was adopted on January 1st, 2023 (Report on Cyprus Negotiations, report_q4.pdf, 2023-01-01)."
4.  In the 'sources' array, list the unique filenames (e.g., "report_q4.pdf") of all documents that were actually used to create the answer.
5.  If the key points do not contain enough information to answer the question, explicitly state that in the 'answer' field and return an empty 'sources' array.
6.  Your entire response must be a single JSON object matching the provided schema.`;

    const keyPointsContext = keyPoints
        .filter(kp => kp.extractedPoints)
        .map(kp => {
            return `---
From Document:
- Filename: ${kp.document.name}
- Title: ${kp.document.title || 'N/A'}
- Date: ${kp.document.date || 'N/A'}
Key Points:
${kp.extractedPoints}
---`;
        })
        .join('\n\n');

    const prompt = `User's Question: "${query}"\n\n--- EXTRACTED KEY POINTS ---\n${keyPointsContext}\n--- END OF KEY POINTS ---\n\nBased on the key points above, provide the JSON response with detailed inline citations:`;

    const response = await generateContentWithRetries({
        model: 'gemini-2.5-pro',
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
            answer: "Sorry, I received an invalid response from the AI while synthesizing the answer. Please try again.",
            sources: []
        };
    }
};

const buildContextPrompt = (documents: Document[]): string => {
  return documents
    .map(doc => `--- DOCUMENT START: ${doc.name} ---\n${doc.content}\n--- DOCUMENT END: ${doc.name} ---`)
    .join('\n\n');
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
    const truncatedContent = content.substring(0, 8000);
    const prompt = `Generate a concise summary of the key topics, entities, and arguments in the following document. This summary will be used to determine if the document is relevant to a user's question. Focus on specific, searchable terms. Output should be a dense paragraph.

DOCUMENT CONTENT:
${truncatedContent}`;
    
    const response = await generateContentWithRetries({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            temperature: 0.1,
            maxOutputTokens: 250,
            thinkingConfig: { thinkingBudget: 100 },
        }
    });

    return response.text.trim();
};

const metadataSchema = {
    type: Type.OBJECT,
    properties: {
        title: {
            type: Type.STRING,
            description: "The primary title of the document. If no clear title exists, generate a concise, descriptive title based on the content (max 15 words)."
        },
        date: {
            type: Type.STRING,
            description: "The publication date of the document in YYYY-MM-DD format. If no date is found, respond with 'N/A'."
        }
    },
    required: ["title", "date"]
};

export const extractDocumentMetadata = async (content: string): Promise<{ title: string; date: string }> => {
    const truncatedContent = content.substring(0, 4000) + content.substring(content.length - 4000);
    const systemInstruction = "You are an expert at extracting metadata from documents. Analyze the provided text to find the title and publication date. Respond only with a single JSON object matching the schema.";
    const prompt = `Extract the title and date from this document content:\n\n${truncatedContent}`;
    
    const response = await generateContentWithRetries({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: metadataSchema,
        }
    });
    
    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse metadata response:", response.text);
        return { title: "Title extraction failed.", date: "N/A" };
    }
};