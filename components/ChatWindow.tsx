
import React, { useRef, useEffect } from 'react';
import { Message as MessageType, Document } from '../types';
import Message from './Message';
import InputBar from './InputBar';
import DocumentIcon from './icons/DocumentIcon';

interface ChatWindowProps {
  messages: MessageType[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  documents: Document[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading, documents }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
       {messages.length === 0 ? (
         <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
           <DocumentIcon className="h-16 w-16 mb-4 text-gray-400" />
           <h2 className="text-2xl font-semibold mb-2">How the Chat Works</h2>
           <p className="max-w-lg">
             <strong>1. Upload Files:</strong> Go to the 'Documents' tab to upload the files you want to analyze.
             <br/>
             <strong>2. Ask Questions:</strong> Return here to ask questions. The AI will answer based *only* on the information in your documents.
             <br/>
             <strong>3. See Sources:</strong> Every answer from the AI will include the name(s) of the source document(s) used.
           </p>
           <p className="mt-4 font-semibold">
             You currently have {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded.
           </p>
         </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 p-4">
            {messages.map(msg => (
                <Message key={msg.id} message={msg} />
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="flex items-center gap-3 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 max-w-xl">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      )}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <InputBar onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatWindow;
