
import { getChatCompletion, type Message as GroqMessage } from "./groqService";
import { toast } from "@/hooks/use-toast";

export interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export const sendVideoAwareChatMessage = async (
  userMessage: Message,
  messageHistory: Message[],
  userId: string,
  subtitleContext: string = "",
  videoTitle: string = ""
): Promise<Message> => {
  try {
    // Build the conversation history
    const groqMessages: GroqMessage[] = [];

    // Add system message with video context
    let systemPrompt = "You are a helpful mathematics tutor. You help students understand mathematical concepts and solve problems.";
    
    if (subtitleContext) {
      systemPrompt += `\n\nThe student is watching a video titled: "${videoTitle}". The video content at the current timestamp says: "${subtitleContext}". Use this context to provide relevant explanations and help the student understand the concepts being discussed in the video.`;
    }

    groqMessages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add conversation history
    messageHistory.forEach(msg => {
      groqMessages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      });
    });

    // Add current user message
    groqMessages.push({
      role: 'user',
      content: userMessage.text
    });

    // Get AI response
    const responseText = await getChatCompletion(groqMessages, userId);

    // Create response message with subtitle context indicator
    let finalResponse = responseText;
    if (subtitleContext) {
      finalResponse = `📺 **Video context:** "${subtitleContext}"\n\n${responseText}`;
    }

    return {
      id: messageHistory.length + 2,
      text: finalResponse,
      isUser: false,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error getting video-aware response:', error);
    
    toast({
      title: "Ошибка",
      description: "Не удалось получить ответ от ассистента.",
      variant: "destructive"
    });
    
    return {
      id: messageHistory.length + 2,
      text: "Извините, произошла ошибка при обработке вашего запроса.",
      isUser: false,
      timestamp: new Date()
    };
  }
};
