import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { Play } from "lucide-react";

export default function VideoEmbed() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = "https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/videos/test11.mp4";

  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Короткое демо платформы
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
            <video
              ref={videoRef}
              className="w-full h-full"
              controls={isPlaying}
              playsInline
              onPlay={() => setIsPlaying(true)}
            >
              <source src={videoUrl} type="video/mp4" />
              Ваш браузер не поддерживает видео.
            </video>
            
            {!isPlaying && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm cursor-pointer group"
                onClick={handlePlayClick}
              >
                <div className="w-24 h-24 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-2xl">
                  <Play className="w-12 h-12 text-white ml-2" fill="white" />
                </div>
              </div>
            )}
          </div>
          
          <motion.p 
            className="text-center text-muted-foreground mt-6 text-lg"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Навигация по учебнику, практика, и AI-ассистент.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}