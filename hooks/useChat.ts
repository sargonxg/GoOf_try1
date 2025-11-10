import { useState, useCallback } from 'react';
import { Message, Document } from '../types';
import { findRelevantDocuments, extractKeyPointsFromDocument, synthesizeFinalAnswer } from '../services/geminiService';

export const useChat = (documents: Document[]) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      text,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (documents.length === 0) {
        const botMessage: Message = {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: "I can't answer questions without any documents. Please upload some files first in the 'Documents' tab.",
            sources: []
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }
      
      // --- Step 1: Retrieval ---
      const relevantDocuments = await findRelevantDocuments(text, documents);

      if (relevantDocuments.length === 0) {
        const botMessage: Message = {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: "I couldn't find any documents relevant to your question. Please try rephrasing your question or check the uploaded documents.",
        };
        setMessages(prev => [...prev, botMessage]);
        return;
      }
      
      // --- Step 2: Show "thinking" message ---
      const thinkingMessage: Message = {
        id: 'thinking-' + Date.now(),
        sender: 'bot',
        text: `Found ${relevantDocuments.length} relevant document(s). Extracting key points...`,
        isThinking: true,
      };
      setMessages(prev => [...prev, thinkingMessage]);

      // --- Step 3: Map (Extract key points from each document in parallel) ---
      const pointExtractionPromises = relevantDocuments.map(doc => 
          extractKeyPointsFromDocument(text, doc)
      );
      const keyPointsData = await Promise.all(pointExtractionPromises);
      
      const validKeyPoints = keyPointsData.filter(p => p.extractedPoints.trim());

      if (validKeyPoints.length === 0) {
        const botMessage: Message = {
            id: 'bot-' + Date.now(),
            sender: 'bot',
            text: `I scanned ${relevantDocuments.length} document(s) but could not find specific information to answer your question.`,
            sources: relevantDocuments.map(d => d.name)
        };
        setMessages(prev => {
          const filteredMessages = prev.filter(m => !m.isThinking);
          return [...filteredMessages, botMessage];
        });
        return;
      }
      
      setMessages(prev => prev.map(m => m.isThinking ? {...m, text: `Synthesizing answer from ${validKeyPoints.length} source(s)...`} : m));

      // --- Step 4: Reduce (Synthesize a final answer from the key points) ---
      const response = await synthesizeFinalAnswer(text, validKeyPoints);
      
      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: response.answer,
        sources: response.sources,
      };

      // --- Step 5: Replace thinking message with the final answer ---
      setMessages(prev => {
        const filteredMessages = prev.filter(m => !m.isThinking);
        return [...filteredMessages, botMessage];
      });

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
      };
      setMessages(prev => {
        const filteredMessages = prev.filter(m => !m.isThinking);
        return [...filteredMessages, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  }, [documents, setMessages]);

  return { messages, sendMessage, isLoading, setMessages };
};