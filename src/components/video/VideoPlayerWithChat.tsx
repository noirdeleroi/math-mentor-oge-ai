
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, MessageCircle, X } from "lucide-react";
import ChatMessages from "../chat/ChatMessages";
import ChatInput from "../chat/ChatInput";
import { useChatContext } from "@/contexts/ChatContext";
import { sendVideoAwareChatMessage } from "@/services/videoAwareChatService";

interface VideoPlayerWithChatProps {
  video: {
    videoId: string;
    title: string;
    description: string;
  };
  onClose: () => void;
}

const VideoPlayerWithChat = ({ video, onClose }: VideoPlayerWithChatProps) => {
  const [player, setPlayer] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitleContext, setSubtitleContext] = useState<string>("");
  const [useVideoContext, setUseVideoContext] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const { messages, isTyping, addMessage, resetChat } = useChatContext();

  // Load YouTube IFrame API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        initializePlayer();
      };
    } else {
      initializePlayer();
    }

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [video.videoId]);

  const initializePlayer = () => {
    if (playerRef.current && (window as any).YT) {
      const newPlayer = new (window as any).YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: video.videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
      setPlayer(newPlayer);
    }
  };

  const onPlayerReady = (event: any) => {
    console.log('Player ready');
  };

  const onPlayerStateChange = async (event: any) => {
    const playerState = event.data;
    const currentTimestamp = event.target.getCurrentTime();
    setCurrentTime(currentTimestamp);

    // Detect pause event
    if (playerState === (window as any).YT.PlayerState.PAUSED) {
      console.log('Video paused at:', currentTimestamp);
      
      if (useVideoContext) {
        try {
          const subtitles = await fetchSubtitlesForTimestamp(video.videoId, currentTimestamp);
          setSubtitleContext(subtitles);
          console.log('Fetched subtitles:', subtitles);
        } catch (error) {
          console.error('Error fetching subtitles:', error);
          setSubtitleContext("Subtitles not available for this timestamp.");
        }
      }
    }
  };

  const fetchSubtitlesForTimestamp = async (videoId: string, timestamp: number): Promise<string> => {
    // For now, return a mock subtitle based on timestamp
    // In a real implementation, this would fetch from your VTT files or YouTube API
    const mockSubtitles = {
      0: "Welcome to this mathematics lesson.",
      30: "Today we'll be covering linear equations.",
      60: "A linear equation is an equation of the first degree.",
      90: "The general form is ax + b = 0.",
      120: "Let's solve some examples together.",
      150: "First, isolate the variable x.",
      180: "Remember to perform the same operation on both sides.",
    };

    // Find the closest timestamp
    const timestamps = Object.keys(mockSubtitles).map(Number).sort((a, b) => a - b);
    let closestTimestamp = timestamps[0];
    
    for (const ts of timestamps) {
      if (Math.abs(ts - timestamp) < Math.abs(closestTimestamp - timestamp)) {
        closestTimestamp = ts;
      }
    }

    return mockSubtitles[closestTimestamp as keyof typeof mockSubtitles] || "No subtitles available for this segment.";
  };

  const handleSendMessage = async (userInput: string) => {
    const newUserMessage = {
      id: messages.length + 1,
      text: userInput,
      isUser: true,
      timestamp: new Date()
    };
    
    addMessage(newUserMessage);

    try {
      const aiResponse = await sendVideoAwareChatMessage(
        newUserMessage, 
        messages, 
        useVideoContext ? subtitleContext : "",
        video.title
      );
      addMessage(aiResponse);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="mb-12">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-6 h-6 text-red-600" />
                {video.title}
              </CardTitle>
              <CardDescription>{video.description}</CardDescription>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                <div ref={playerRef} className="w-full h-full" />
              </div>
              
              {/* Video Controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="video-context"
                      checked={useVideoContext}
                      onCheckedChange={setUseVideoContext}
                    />
                    <Label htmlFor="video-context">Context from video</Label>
                  </div>
                </div>
                
                <Button
                  variant={showChat ? "default" : "outline"}
                  onClick={() => setShowChat(!showChat)}
                  className="lg:hidden"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {showChat ? "Hide Chat" : "Show Chat"}
                </Button>
              </div>

              {/* Subtitle Context Display */}
              {subtitleContext && useVideoContext && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">📺 Video context: </span>
                    "{subtitleContext}"
                  </p>
                </div>
              )}
            </div>

            {/* Chat Section */}
            <div className={`lg:block ${showChat ? 'block' : 'hidden'}`}>
              <Card className="h-96 flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Video Assistant</CardTitle>
                  <CardDescription>
                    Ask questions about the video content
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0">
                  <div className="flex-1">
                    <ChatMessages messages={messages} isTyping={isTyping} />
                  </div>
                  <ChatInput onSendMessage={handleSendMessage} isTyping={isTyping} />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoPlayerWithChat;
