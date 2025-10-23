import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";

interface DropdownItem {
  label: string;
  href?: string;
  disabled?: boolean;
  tooltip?: string;
}

interface DropdownMenuProps {
  title: string;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
}

const DropdownMenu = ({ title, items, isOpen, onToggle }: DropdownMenuProps) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-3 py-2 text-white hover:text-yellow-400 transition-colors duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-50"
            role="menu"
          >
            <div className="py-2">
              {items.map((item, index) => (
                <div key={index} className="relative">
                  {item.disabled ? (
                    <div
                      className="px-4 py-2 text-muted-foreground cursor-not-allowed"
                      onMouseEnter={() => setShowTooltip(item.tooltip || "")}
                      onMouseLeave={() => setShowTooltip(null)}
                      role="menuitem"
                      aria-disabled="true"
                    >
                      {item.label}
                      {showTooltip === item.tooltip && (
                        <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded border shadow-md whitespace-nowrap">
                          {item.tooltip}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      to={item.href!}
                      className="block px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                      role="menuitem"
                      onClick={onToggle}
                    >
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LandingHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleDropdownToggle = (dropdownName: string) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const handleLoginClick = () => {
    if (user) {
      navigate("/mydb3");
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const dropdownItems = {
    textbook: [
      { label: "ОГЭ математика", href: "/new-textbook" },
      { label: "ЕГЭ базовый уровень (математика)", disabled: true, tooltip: "Скоро" },
      { label: "ЕГЭ профильный уровень (математика)", disabled: true, tooltip: "Скоро" }
    ],
    platform: [
      { label: "ОГЭ математика", href: "/textbook3" },
      { label: "ЕГЭ базовый уровень (математика)", disabled: true, tooltip: "Скоро" },
      { label: "ЕГЭ профильный уровень (математика)", disabled: true, tooltip: "Скоро" }
    ],
    practice: [
      { label: "ОГЭ математика", href: "/questions" },
      { label: "ЕГЭ базовый уровень (математика)", disabled: true, tooltip: "Скоро" },
      { label: "ЕГЭ профильный уровень (математика)", disabled: true, tooltip: "Скоро" }
    ]
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/10 backdrop-blur supports-[backdrop-filter]:bg-white/5">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between text-white">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img 
            src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/object/public/avatars/logo100.png" 
            alt="EGEChat Logo" 
            className="w-14 h-14"
          />
          <span className="font-bold text-xl text-white">EGEChat</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <DropdownMenu
            title="Учебник"
            items={dropdownItems.textbook}
            isOpen={openDropdown === "textbook"}
            onToggle={() => handleDropdownToggle("textbook")}
          />
          

          
          <DropdownMenu
            title="Практика"
            items={dropdownItems.practice}
            isOpen={openDropdown === "practice"}
            onToggle={() => handleDropdownToggle("practice")}
          />

          <Link
            to="/about"
            className="text-white hover:text-yellow-400 transition-colors duration-200"
          >
            О Платформе
          </Link>

          <Link
            to="/faq"
            className="text-white hover:text-yellow-400 transition-colors duration-200"
          >
            FAQ
          </Link>

          <Link
            to="/egeruses2"
            className="text-white hover:text-yellow-400 transition-colors duration-200"
          >
            Сочинение
          </Link>


          <Button
            onClick={handleLoginClick}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-6 py-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {user ? "Дашборд" : "Войти"}
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Button
            onClick={handleLoginClick}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2"
          >
            <LogIn className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialView="signin"
      />
    </header>
  );
}
