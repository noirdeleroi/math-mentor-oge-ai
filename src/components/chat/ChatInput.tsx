
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Database } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { useChatContext } from "@/contexts/ChatContext";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isTyping: boolean;
}

const ChatInput = ({ onSendMessage, isTyping }: ChatInputProps) => {
  const [userInput, setUserInput] = useState("");
  const { isDatabaseMode, setIsDatabaseMode } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      
      // Calculate the number of lines
      const lineHeight = 24; // Approximate line height in pixels
      const minHeight = lineHeight; // 1 row
      const maxHeight = lineHeight * 7; // 7 rows max
      
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      
      textarea.style.height = `${newHeight}px`;
      
      // If content exceeds 7 rows, enable scrolling
      if (scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [userInput]);

  return (
    <div className="bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex gap-2 items-center bg-gray-100/90 backdrop-blur-sm rounded-2xl p-2 shadow-inner">
          <Toggle
            pressed={isDatabaseMode}
            onPressedChange={setIsDatabaseMode}
            variant="outline"
            size="sm"
            className={`shrink-0 h-8 w-8 p-0 rounded-lg border transition-all ${
              isDatabaseMode 
                ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' 
                : 'border-gray-300 hover:bg-gray-200/50 text-gray-600'
            }`}
            title="База"
          >
            <Database className="h-4 w-4" />
          </Toggle>
          <textarea
            ref={textareaRef}
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder={isDatabaseMode ? "Напиши 'дай задачу' и я дам тебе пример из нашей базы..." : "Напишите вопрос..."} 
            className="flex-1 border-0 bg-transparent focus:ring-0 text-base placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[168px] overflow-hidden focus:outline-none" 
            disabled={isTyping}
            rows={1}
            style={{ lineHeight: '24px', outline: 'none' }}
          />
          <Button 
            onClick={handleSendMessage} 
            size="icon"
            className="bg-[#f59e0b] hover:bg-[#d97706] rounded-full w-10 h-10 p-0 transition-all duration-200 shadow-md" 
            disabled={!userInput.trim() || isTyping}
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
