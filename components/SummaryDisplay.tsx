
import React from 'react';
import { SummaryData } from '../types';
import { marked } from 'marked';
import CountryIcon from './icons/CountryIcon';
import StakeholderIcon from './icons/StakeholderIcon';

interface SummaryDisplayProps {
  data: SummaryData;
}

const renderer = new marked.Renderer();
renderer.link = (href, title, text) =>
  `<a target="_blank" rel="noopener noreferrer" href="${href}" title="${title || ''}">${text}</a>`;

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ data }) => {
  const summaryHtml = marked.parse(data.summaryText, { renderer }) as string;

  return (
    <div className="space-y-6">
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: summaryHtml }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <CountryIcon className="h-5 w-5" />
            Countries Mentioned
          </h3>
          {data.countries.length > 0 ? (
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              {data.countries.map((country, index) => (
                <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    {country}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No specific countries were identified.</p>
          )}
        </div>
        
        <div>
          <h3 className="text-md font-semibold mb-3 flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <StakeholderIcon className="h-5 w-5" />
            Key Stakeholders
          </h3>
          {data.stakeholders.length > 0 ? (
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              {data.stakeholders.map((stakeholder, index) => (
                <li key={index} className="flex items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                    {stakeholder}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No specific stakeholders were identified.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryDisplay;
