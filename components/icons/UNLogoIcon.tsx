
import React from 'react';

const UNLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    {...props}
  >
    <defs>
      <path
        id="branch"
        d="M2 50a48 48 0 017-18 48 48 0 00-7 18zM9 32a48 48 0 018-12 48 48 0 00-8 12zM17 20a48 48 0 018-7 48 48 0 00-8 7zM25 13a48 48 0 019-4 48 48 0 00-9 4zM34 9a48 48 0 019 0 48 48 0 00-9 0zM43 9a48 48 0 019 0 48 48 0 00-9 0zM52 9a48 48 0 019 4 48 48 0 00-9-4zM61 13a48 48 0 018 7 48 48 0 00-8-7zM69 20a48 48 0 017 12 48 48 0 00-7-12zM77 32a48 48 0 012 18 48 48 0 00-2-18z"
        fill="currentColor"
      />
    </defs>
    <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M50 25v50M25 50h50M30 30l40 40M30 70l40-40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle cx="50" cy="50" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
    <use href="#branch" transform="translate(8, 0)" />
    <use href="#branch" transform="translate(-8, 0) scale(-1, 1) translate(-100, 0)" />
  </svg>
);

export default UNLogoIcon;
