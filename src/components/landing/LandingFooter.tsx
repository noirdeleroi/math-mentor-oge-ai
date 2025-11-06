import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

export default function LandingFooter() {
  return (
    <footer className="bg-gradient-to-b from-slate-800/95 to-slate-900/95 border-t border-white/10 text-white">
      <div className="container mx-auto px-4 py-6">
        <motion.div
          className="flex items-center justify-between gap-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {/* Left: ЭЙАЙ / ПРОВЕРКА */}
          <Link to="/" className="flex flex-col leading-tight">
            <span className="text-xs font-semibold text-emerald-400 tracking-[0.25em] uppercase">
              ЭЙАЙ
            </span>
            <span className="font-black text-xl md:text-2xl tracking-wide">
              ПРОВЕРКА
            </span>
          </Link>

          {/* Center: navigation like on screenshot */}
          <nav className="hidden md:flex items-center gap-8 text-xs md:text-sm font-semibold tracking-wide uppercase">
            <Link
              to="/about"
              className="hover:text-yellow-400 transition-colors duration-200"
            >
              О сервисе
            </Link>
            <Link
              to="/privacy"
              className="hover:text-yellow-400 transition-colors duration-200"
            >
              Конфиденциальность
            </Link>
            <Link
              to="/terms"
              className="hover:text-yellow-400 transition-colors duration-200"
            >
              Условия использования
            </Link>
            <a
              href="mailto:support@egechat.ru"
              className="hover:text-yellow-400 transition-colors duration-200"
            >
              Контакты
            </a>
          </nav>

          {/* Right: Telegram icon in circle */}
          <a
            href="https://t.me/egechat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-full border border-white/40 hover:bg-white hover:text-slate-900 transition-colors duration-200"
          >
            <Send className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </footer>
  );
}
