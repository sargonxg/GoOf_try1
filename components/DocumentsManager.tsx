
import React, { useState, useRef, ChangeEvent } from 'react';
import { Document } from '../types';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import DocumentIcon from './icons/DocumentIcon';

// Declare pdfjsLib to satisfy TypeScript, as it's loaded from a CDN
declare const pdfjsLib: any;
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs`;
}

const MAX_DOCS = 50;

interface DocumentsManagerProps {
  documents: Document[];
  addDocuments: (newDocs: Document[]) => void;
  removeDocument: (id: string) => void;
  onGenerateSummary: () => void;
  isSummarizing: boolean;
}

const DocumentsManager: React.FC<DocumentsManagerProps> = ({
  documents,
  addDocuments,
  removeDocument,
  onGenerateSummary,
  isSummarizing
}) => {
  const [parsingStatus, setParsingStatus] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File): Promise<Omit<Document, 'description'>> => {
    return new Promise((resolve, reject) => {
      setParsingStatus(prev => ({ ...prev, [file.name]: 'pending' }));
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let content = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              content += textContent.items.map((item: any) => item.str).join(' ');
            }
            setParsingStatus(prev => ({ ...prev, [file.name]: 'success' }));
            resolve({ id: `${file.name}-${Date.now()}`, name: file.name, content });
          } catch (err) {
            console.error(`Error parsing PDF ${file.name}:`, err);
            setParsingStatus(prev => ({ ...prev, [file.name]: 'error' }));
            reject(new Error(`Failed to parse PDF: ${file.name}`));
          }
        };
        reader.onerror = () => {
             setParsingStatus(prev => ({ ...prev, [file.name]: 'error' }));
             reject(new Error('Failed to read file.'));
        }
        reader.readAsArrayBuffer(file);
      } else if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setParsingStatus(prev => ({ ...prev, [file.name]: 'success' }));
          resolve({ id: `${file.name}-${Date.now()}`, name: file.name, content });
        };
        reader.onerror = () => {
            setParsingStatus(prev => ({ ...prev, [file.name]: 'error' }));
            reject(new Error('Failed to read file.'));
       }
        reader.readAsText(file);
      } else {
        setParsingStatus(prev => ({ ...prev, [file.name]: 'error' }));
        reject(new Error('Unsupported file type'));
      }
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (documents.length + files.length > MAX_DOCS) {
        alert(`You can only upload up to ${MAX_DOCS} documents. You have ${documents.length} and tried to add ${files.length}.`);
        return;
    }

    const newDocuments: Omit<Document, 'description'>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const doc = await parseFile(file);
        newDocuments.push(doc);
      } catch (error) {
        console.error(error);
      }
    }
    addDocuments(newDocuments as Document[]);
    
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const canUpload = documents.length < MAX_DOCS;

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Manage Documents</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        <b>Step 1:</b> Upload up to 50 PDF or TXT files to create a knowledge base. An AI-generated description will appear for each file.
        <br />
        <b>Step 2:</b> Once you've uploaded your files, go to the <b>Chat</b> tab to ask questions about them.
      </p>

      <div className="mb-6">
        <input
          type="file"
          multiple
          accept=".pdf,.txt"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={!canUpload}
        />
        <button
          onClick={handleUploadClick}
          disabled={!canUpload}
          className="w-full flex justify-center items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UploadIcon className="h-6 w-6" />
          <span>{canUpload ? 'Click to Upload Documents' : `Maximum ${MAX_DOCS} documents reached`}</span>
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Uploaded Files ({documents.length} / {MAX_DOCS})
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm text-center py-4 text-gray-500 dark:text-gray-400">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 border-t border-b border-gray-200 dark:border-gray-700">
            {documents.map(doc => (
              <li key={doc.id} className="flex items-start justify-between py-4">
                <div className="flex items-start gap-4">
                  <DocumentIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{doc.name}</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {doc.description === '...' ? 'Generating description...' : doc.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeDocument(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={`Remove ${doc.name}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {documents.length > 0 && (
         <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Generate Enhanced Summary</h3>
            <p className="text-gray-600 dark:text-gray-400 my-2">
              Create a comprehensive summary of all uploaded documents. This will also extract mentioned countries and stakeholders, and will appear in the chat window.
            </p>
            <button
              onClick={onGenerateSummary}
              disabled={isSummarizing}
              className="w-full sm:w-auto mt-2 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSummarizing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Summarizing...</span>
                </>
              ) : (
                'Generate Summary'
              )}
            </button>
        </div>
      )}
    </div>
  );
};

export default DocumentsManager;
