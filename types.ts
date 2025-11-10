export interface Document {
  id: string;
  name: string;
  content: string;
  description?: string;
  title?: string;
  date?: string;
}

export interface SummaryData {
  summaryText: string;
  countries: string[];
  stakeholders: string[];
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  sources?: string[];
  isSummary?: boolean;
  summaryData?: SummaryData;
  isThinking?: boolean;
}

export enum AppView {
  CHAT = 'CHAT',
  DOCUMENTS = 'DOCUMENTS',
}