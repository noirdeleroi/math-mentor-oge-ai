import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LandingHero from "@/components/landing/LandingHero";
import PromptBar from "@/components/PromptBar";
import HighlightCards from "@/components/landing/HighlightCards";
import VideoEmbed from "@/components/landing/VideoEmbed";
import ChatDemo from "@/components/landing/ChatDemo";
import MathematicsSection from "@/components/landing/MathematicsSection";
import { EssaySection } from "@/components/landing/EssaySection";
import LandingCTA from "@/components/landing/LandingCTA";
import LandingFooter from "@/components/landing/LandingFooter";

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
    <div className="relative z-10">
      <main>
        <LandingHero />
        <HighlightCards />
        <MathematicsSection />
        <EssaySection />
        <ChatDemo />
        <VideoEmbed />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
