import React, { useEffect, useState } from 'react';

const TextScramble: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [display, setDisplay] = useState('');
  const chars = '!<>-_\\/[]{}—=+*^?#________';

  useEffect(() => {
    let frame = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplay(text.split('').map((char, i) => {
          if (i < frame / 2) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        }).join(''));
        
        frame++;
        if (frame > text.length * 2) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span className="font-mono">{display}</span>;
};

export default TextScramble;