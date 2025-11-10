
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import DocumentsManager from './components/DocumentsManager';
import ChatWindow from './components/ChatWindow';
import { AppView, Document } from './types';
import { useChat } from './hooks/useChat';
import { getSummary, getDocumentDescription } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.DOCUMENTS);
  const [documents, setDocuments] = useState<Document[]>([]);
  const { messages, sendMessage, isLoading, setMessages } = useChat(documents);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const addDocuments = (newDocs: Document[]) => {
    setDocuments(prevDocs => {
      const existingDocNames = new Set(prevDocs.map(d => d.name));
      const uniqueNewDocs = newDocs
        .filter(d => !existingDocNames.has(d.name))
        .map(d => ({ ...d, description: '...' })); // '...' indicates loading

      if (prevDocs.length + uniqueNewDocs.length > 50) {
        alert(`You can only upload up to 50 documents. Please remove some before adding more.`);
        return prevDocs;
      }
      
      const allDocs = [...prevDocs, ...uniqueNewDocs];

      uniqueNewDocs.forEach(doc => {
        getDocumentDescription(doc.content)
          .then(description => {
            setDocuments(currentDocs => currentDocs.map(d =>
              d.id === doc.id ? { ...d, description } : d
            ));
          })
          .catch(() => {
            setDocuments(currentDocs => currentDocs.map(d =>
              d.id === doc.id ? { ...d, description: "Failed to load description." } : d
            ));
          });
      });

      return allDocs;
    });
  };

  const removeDocument = (id: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
  };

  const handleGenerateSummary = useCallback(async () => {
    if (documents.length === 0) {
      alert("Please upload at least one document to generate a summary.");
      return;
    }
    setIsSummarizing(true);
    try {
      const summaryData = await getSummary(documents);
      setMessages([
        {
          id: 'summary-' + Date.now(),
          sender: 'bot',
          text: `Summary of Uploaded Documents`,
          isSummary: true,
          summaryData: summaryData,
        },
      ]);
      setView(AppView.CHAT);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary. Please check the console for details.");
    } finally {
      setIsSummarizing(false);
    }
  }, [documents, setMessages]);


  return (
    <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Header currentView={view} setView={setView} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {view === AppView.DOCUMENTS ? (
          <DocumentsManager
            documents={documents}
            addDocuments={addDocuments}
            removeDocument={removeDocument}
            onGenerateSummary={handleGenerateSummary}
            isSummarizing={isSummarizing}
          />
        ) : (
          <ChatWindow
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            documents={documents}
          />
        )}
      </main>
    </div>
  );
};

export default App;
