
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Database } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useChatContext } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

const ChatInput = ({ onSendMessage, isTyping }: ChatInputProps) => {
  const [userInput, setUserInput] = useState("");
  const { isDatabaseMode, setIsDatabaseMode } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  const handleSendMessage = () => {
    if (userInput.trim() === "") return;
    onSendMessage(userInput);
    setUserInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Calculate the number of lines - mobile uses smaller line height
      const lineHeight = isMobile ? 20 : 24; // Smaller on mobile for single line
      const minHeight = lineHeight; // 1 row - exact single line height
      const maxHeight = isMobile ? lineHeight * 5 : lineHeight * 7; // 5 rows max on mobile, 7 on desktop
      
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      textarea.style.height = `${newHeight}px`;
      
      // If content exceeds max rows, enable scrolling
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [userInput, isMobile]);

  return (
    <div className="bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div className={`flex gap-2 items-center bg-gray-100/90 backdrop-blur-sm rounded-2xl shadow-inner ${isMobile ? 'p-1.5' : 'p-2'}`}>
          <Toggle
            pressed={isDatabaseMode}
            onPressedChange={setIsDatabaseMode}
            variant="outline"
            size="sm"
            className={`shrink-0 ${isMobile ? 'h-7 w-7' : 'h-8 w-8'} p-0 rounded-lg border transition-all ${
              isDatabaseMode 
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' 
                : 'border-gray-300 hover:bg-gray-200/50 text-gray-600'
            }`}
            title="База"
          >
            <Database className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </Toggle>
          <textarea
            ref={textareaRef}
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder={isDatabaseMode ? "Напиши 'дай задачу' и я дам тебе пример из нашей базы..." : "Напишите вопрос..."} 
            className={`flex-1 border-0 bg-transparent focus:ring-0 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none overflow-hidden focus:outline-none ${
              isMobile 
                ? 'text-sm min-h-[20px] max-h-[100px]' 
                : 'text-base min-h-[24px] max-h-[168px]'
            }`}
            disabled={isTyping}
            rows={1}
            style={{ 
              lineHeight: isMobile ? '20px' : '24px', 
              outline: 'none'
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            className={`bg-[#f59e0b] hover:bg-[#d97706] rounded-full p-0 transition-all duration-200 shadow-md ${
              isMobile ? 'w-8 h-8' : 'w-10 h-10'
            }`}
            disabled={!userInput.trim() || isTyping}
          >
            <Send className={`text-white ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
