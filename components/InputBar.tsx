
import React, { useState, KeyboardEvent } from 'react';
import SendIcon from './icons/SendIcon';

interface InputBarProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const InputBar: React.FC<InputBarProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Ask a question about the documents..."
        className="flex-1 bg-transparent p-2 rounded-md focus:outline-none resize-none dark:text-white placeholder-gray-500"
        rows={1}
        disabled={isLoading}
      />
      <button
        onClick={handleSend}
        disabled={isLoading || !text.trim()}
        className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors"
        aria-label="Send message"
      >
        <SendIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default InputBar;
