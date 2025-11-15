/**
 * Utility functions for simulating streaming text output
 */

/**
 * Tokenizes text by splitting into words (keeping spaces and punctuation)
 * This creates a more natural streaming effect
 */
export const tokenizeText = (text: string): string[] => {
  // Use a regex to split by word boundaries while preserving spaces
  // This matches words, spaces, and punctuation
  const tokens: string[] = [];
  const regex = /(\S+\s*)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  
  // If no matches (empty text), return empty array
  if (tokens.length === 0 && text.length > 0) {
    // Fallback: split by character for very short or special text
    return text.split('');
  }
  
  return tokens;
};

/**
 * Simulates streaming text with adaptive chunking for smoother effect
 * Uses character-by-character with intelligent chunking for better performance
 * @param fullText - The complete text to stream
 * @param onUpdate - Callback called with progressively longer text
 * @param onComplete - Callback called when streaming is complete
 * @param speed - Delay in milliseconds between chunks (default: 8ms for smoother effect)
 */
export const streamText = (
  fullText: string,
  onUpdate: (text: string) => void,
  onComplete?: () => void,
  speed: number = 8
): (() => void) => {
  let currentIndex = 0;
  let rafId: number | null = null;
  let lastTime = performance.now();
  let isCancelled = false;
  
  const streamNext = (currentTime: number) => {
    if (isCancelled || currentIndex >= fullText.length) {
      if (!isCancelled && currentIndex >= fullText.length && onComplete) {
        onComplete();
      }
      return;
    }
    
    // Use time-based animation for smoother effect
    const elapsed = currentTime - lastTime;
    if (elapsed >= speed) {
      // Determine how many characters to add based on elapsed time
      const charsToAdd = Math.min(
        Math.floor(elapsed / speed),
        fullText.length - currentIndex
      );
      
      if (charsToAdd > 0) {
        currentIndex += charsToAdd;
        const currentText = fullText.slice(0, currentIndex);
        onUpdate(currentText);
        lastTime = currentTime;
      }
    }
    
    // Continue with requestAnimationFrame for smooth animation
    rafId = requestAnimationFrame(streamNext);
  };
  
  // Start streaming
  rafId = requestAnimationFrame(streamNext);
  
  // Return cancel function
  return () => {
    isCancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
};

/**
 * Alternative: Character-by-character streaming for smoother effect
 */
export const streamTextByChar = (
  fullText: string,
  onUpdate: (text: string) => void,
  onComplete?: () => void,
  speed: number = 15
): (() => void) => {
  let currentIndex = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let isCancelled = false;
  
  const streamNext = () => {
    if (isCancelled || currentIndex >= fullText.length) {
      if (!isCancelled && currentIndex >= fullText.length && onComplete) {
        onComplete();
      }
      return;
    }
    
    // Add next character
    const currentText = fullText.slice(0, currentIndex + 1);
    currentIndex++;
    
    // Call update callback
    onUpdate(currentText);
    
    // Schedule next character
    timeoutId = setTimeout(streamNext, speed);
  };
  
  // Start streaming
  streamNext();
  
  // Return cancel function
  return () => {
    isCancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
};

