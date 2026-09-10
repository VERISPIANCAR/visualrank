import React from 'react';

export const SplitText = ({ text = '', className = '' }) => {
  return (
    <span className={`inline-block font-bold tracking-tight ${className}`}>
      {text.split('').map((char, index) => (
        <span key={index} className="inline-block transition-transform duration-200 hover:-translate-y-0.5">
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

export default SplitText;