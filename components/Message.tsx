import React from 'react';
import { Message as MessageType } from '../types';
import SourceIcon from './icons/SourceIcon';
import KnowledgeIcon from './icons/KnowledgeIcon';
import { marked } from 'marked';
import SummaryDisplay from './SummaryDisplay';

// A simple but safer Marked setup
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderer = new marked.Renderer();
// Make links open in a new tab
renderer.link = (href, title, text) =>
  `<a target="_blank" rel="noopener noreferrer" href="${href}" title="${title || ''}">${text}</a>`;


interface MessageProps {
  message: MessageType;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const isBot = message.sender === 'bot';
  const htmlContent = marked.parse(message.text, { renderer }) as string;

  if (message.isThinking) {
    return (
       <div className="flex justify-center">
            <div
                className="text-sm italic text-gray-500 dark:text-gray-400 py-2 px-4"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
       </div>
    );
  }

  if (isBot && message.isSummary && message.summaryData) {
    return (
        <div className="flex justify-start">
             <div className="flex items-start gap-3 max-w-full w-full">
                <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-blue-500 text-white">
                    <KnowledgeIcon className="h-6 w-6" />
                </div>
                 <div className="w-full">
                    <div className="p-4 rounded-lg shadow-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none">
                        <h2 className="text-lg font-bold mb-4">Summary of Uploaded Documents</h2>
                        <SummaryDisplay data={message.summaryData} />
                    </div>
                 </div>
             </div>
        </div>
    );
  }

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`flex items-start gap-3 max-w-xl lg:max-w-3xl ${
          isBot ? '' : 'flex-row-reverse'
        }`}
      >
        <div
          className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
            isBot ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
          }`}
        >
          {isBot ? <KnowledgeIcon className="h-6 w-6" /> : 'You'}
        </div>
        <div>
          <div
            className={`p-4 rounded-lg shadow-sm ${
              isBot
                ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                : 'bg-blue-600 text-white rounded-br-none'
            }`}
          >
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
          {isBot && message.sources && message.sources.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <SourceIcon className="h-4 w-4" />
              <span>Sources: {message.sources.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;