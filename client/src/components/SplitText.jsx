import React from 'react';

export const SplitText = ({ text = '', className = '' }) => {
  return (
    <h1 className={`inline-block overflow-hidden font-bold tracking-tight ${className}`}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-fade-in-up transition-transform duration-300 hover:-translate-y-0.5"
          style={{ animationDelay: `${index * 20}ms` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
};