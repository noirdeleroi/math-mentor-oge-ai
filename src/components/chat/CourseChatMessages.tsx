import { useEffect, useRef, useState } from "react";
import { type Message } from "@/contexts/ChatContext";
import CourseChatMessage from "./CourseChatMessage";
import TypingIndicator from "./TypingIndicator";

import { kaTeXManager } from "@/hooks/useMathJaxInitializer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface CourseChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  onLoadMoreHistory?: () => void;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
}

const CourseChatMessages = ({ messages, isTyping, onLoadMoreHistory, isLoadingHistory, hasMoreHistory }: CourseChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(messages.length);
  const [tutorAvatar, setTutorAvatar] = useState<string>('');
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch tutor avatar from profiles table
  useEffect(() => {
    const fetchTutorAvatar = async () => {
      if (user) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('tutor_avatar_url')
            .eq('user_id', user.id)
            .single();

          if (error) {
            console.error('Error fetching tutor avatar:', error);
            return;
          }

          if (profile?.tutor_avatar_url) {
            setTutorAvatar(profile.tutor_avatar_url);
          }
        } catch (error) {
          console.error('Error fetching tutor avatar:', error);
        }
      }
    };

    fetchTutorAvatar();
  }, [user]);

  
  const scrollToUserMessage = (smooth = true) => {
    // Find the last user message
    const userMessages = messages.filter(msg => msg.isUser);
    if (userMessages.length === 0) return;
    
    if (lastUserMessageRef.current) {
      lastUserMessageRef.current.scrollIntoView({ 
        behavior: smooth ? "smooth" : "auto",
        block: "start" // Position at the top of the visible area
      });
    }
  };

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    });
  };

  const isNearBottom = () => {
    if (!containerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 80; // 80px threshold as requested
  };

  const handleScroll = () => {
    if (containerRef.current) {
      const nearBottom = isNearBottom();
      
      // Update auto-scroll behavior based on user's scroll position
      if (nearBottom) {
        setShouldAutoScroll(true);
        setIsUserScrolledUp(false);
      } else {
        // Only mark as scrolled up if user manually scrolled (not during initial load)
        if (messages.length > 0) {
          setIsUserScrolledUp(true);
          setShouldAutoScroll(false);
        }
      }
    }
  };

  // Auto-scroll when new messages arrive or typing indicator changes
  useEffect(() => {
    const hasNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (containerRef.current && shouldAutoScroll) {
      // Use requestAnimationFrame to wait for React's DOM updates to complete
      requestAnimationFrame(() => {
        // Process KaTeX for visible messages first, then scroll
        const visibleMessages = containerRef.current?.querySelectorAll('[data-message]');
        visibleMessages?.forEach(msg => {
          const htmlMsg = msg as HTMLElement;
          if (htmlMsg.isConnected && htmlMsg.parentNode) {
            try {
              kaTeXManager.renderMath(htmlMsg);
            } catch (error) {
              // Silently ignore rendering errors during DOM updates
            }
          }
        });
        
        // Scroll to show user's last message at top for new messages
        if (hasNewMessage) {
          setTimeout(() => {
            scrollToUserMessage();
          }, 50);
        } else if (isTyping) {
          // For typing indicator, scroll to bottom
          setTimeout(() => {
            scrollToBottom();
          }, 50);
        }
      });
    }
  }, [messages, isTyping, shouldAutoScroll]);

  // Initial scroll when component mounts
  useEffect(() => {
    if (messages.length > 0 && !isUserScrolledUp) {
      setTimeout(() => {
        scrollToUserMessage(false); // Instant scroll on initial load to user's last message
      }, 100);
    }
  }, []);

  return (
    <div className="relative h-full">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
        style={{ fontFamily: 'Inter, Poppins, Montserrat, sans-serif' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          {/* Load more history button */}
          {hasMoreHistory && onLoadMoreHistory && (
            <div className="flex justify-center py-4">
              <button
                onClick={onLoadMoreHistory}
                disabled={isLoadingHistory}
                className="px-6 py-2 bg-gradient-to-br from-[#f59e0b] to-[#10b981]
                           hover:from-[#fbbf24] hover:to-[#34d399] text-white rounded-full 
                           shadow-lg transform transition-all duration-300 ease-in-out 
                           hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/30 
                           disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isLoadingHistory ? 'Загрузка...' : 'Загрузить больше прошлых сообщений'}
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="text-muted-foreground/60 text-center py-8 text-sm">
              Начните беседу...
            </div>
          ) : (
            messages.map((message, index) => {
              const isLastUserMessage = message.isUser && 
                messages.slice(index + 1).every(msg => !msg.isUser);
              
              return (
                <div 
                  key={message.id} 
                  ref={isLastUserMessage ? lastUserMessageRef : null}
                >
                  <CourseChatMessage message={message} />
                </div>
              );
            })
          )}
          
          {isTyping && (
            <div className="flex justify-start items-start gap-3 animate-fade-in">
              <div className="flex-shrink-0">
                <img 
                  src={tutorAvatar || "https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/txtbkimg/1001egechat_logo.png"}
                  alt="AI avatar"
                  className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                />
              </div>
              <div className="bg-white/60 backdrop-blur-md px-4 py-3 rounded-2xl rounded-tl-md shadow-lg border border-white/30">
                <TypingIndicator />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

    </div>
  );
};

export default CourseChatMessages;