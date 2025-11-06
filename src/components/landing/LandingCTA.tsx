import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Crown, Shield, RefreshCw, CreditCard } from "lucide-react";

export default function LandingCTA() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl p-12 border border-white/20 shadow-xl"
        >
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">
            <span className="bg-gradient-to-r from-yellow-500 to-emerald-500 bg-clip-text text-transparent">Подписка за 999 ₽/месяц</span>
            <br />
            <span className="text-white">— полный доступ ко всему!</span>
          </h2>
          
          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed">
            Учебник, видео, база задач, практика и AI-ассистент.
          </p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button 
              asChild 
              size="lg" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-12 py-6 text-xl rounded-full font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Link to="/subscribe" className="flex items-center gap-3">
                <Crown className="w-6 h-6" />
                Оформить подписку
              </Link>
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-8 text-white/70"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Безопасная оплата</span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Отмена в любой момент</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Все способы оплаты</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}