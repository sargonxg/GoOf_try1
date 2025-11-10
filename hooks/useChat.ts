
import { useState, useCallback } from 'react';
import { Message, Document } from '../types';
import { getChatResponse } from '../services/geminiService';

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

      const response = await getChatResponse(text, documents);
      
      const botMessage: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: response.answer,
        sources: response.sources
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [documents]);

  return { messages, sendMessage, isLoading, setMessages };
};
