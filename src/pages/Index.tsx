import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import PromptBar from "@/components/PromptBar";
import HighlightCards from "@/components/landing/HighlightCards";
import VideoEmbed from "@/components/landing/VideoEmbed";
import ChatDemo from "@/components/landing/ChatDemo";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import FlyingMathBackground from "@/components/FlyingMathBackground";

const Index = () => {
  const { isLoading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Show loading while authentication state is being determined
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen relative" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <FlyingMathBackground />
      <div className="relative z-10">
        <LandingHeader />
        <main>
          <LandingHero />
          <HighlightCards />
          <VideoEmbed />
          <ChatDemo />
          <LandingCTA />
        </main>
        <LandingFooter />
      </div>
    </div>
  );
};

export default Index;
