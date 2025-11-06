import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LogIn, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AuthModal from "@/components/auth/AuthModal";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";

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
    if (!isOpen) return;

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

    // Add small delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

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

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full left-0 mt-1 w-64 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl z-[100]"
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
                      className="block px-4 py-2 text-foreground hover:bg-orange-500/10 hover:text-orange-500 transition-colors duration-200"
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
  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close dropdown when route changes
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const handleDropdownToggle = (dropdownName: string) => {
    setOpenDropdown(prev => prev === dropdownName ? null : dropdownName);
  };

  const handleLoginClick = () => {
    if (user) {
      navigate("/mydb3");
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const dropdownItems: {
    textbook: Array<{ label: string; href?: string; disabled?: boolean; tooltip?: string }>;
    platform: Array<{ label: string; href?: string; disabled?: boolean; tooltip?: string }>;
    practice: Array<{ label: string; href?: string; disabled?: boolean; tooltip?: string }>;
  } = {
    textbook: [
      { label: "ОГЭ математика", href: "/textbook" },
      { label: "ЕГЭ базовый уровень (математика)", href: "/textbook-base" },
      { label: "ЕГЭ профильный уровень (математика)", href: "/textbook-prof" }
    ],
    platform: [
      { label: "ОГЭ математика", href: "/textbook3" },
      { label: "ЕГЭ базовый уровень (математика)", disabled: true, tooltip: "Скоро" },
      { label: "ЕГЭ профильный уровень (математика)", disabled: true, tooltip: "Скоро" }
    ],
    practice: [
      { label: "ОГЭ математика", href: "/questionbankoge" },
      { label: "ЕГЭ базовый уровень (математика)", href: "/questionbankegeb" },
      { label: "ЕГЭ профильный уровень (математика)", href: "/questionbankegep" }
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




          <Button
            onClick={handleLoginClick}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-6 py-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {user ? "Дашборд" : "Войти"}
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
          <Button
            onClick={() => setMobileMenuOpen(true)}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Menu className="w-6 h-6" />
          </Button>
          <Button
            onClick={handleLoginClick}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-4 py-2"
          >
            <LogIn className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DrawerContent className="h-[85vh]">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-xl">Меню</span>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="w-5 h-5" />
                </Button>
              </DrawerClose>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="flex flex-col gap-4">
                {/* Учебник Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Учебник</h3>
                  <div className="flex flex-col gap-2 ml-4">
                    {dropdownItems.textbook.map((item, index) => (
                      item.disabled ? (
                        <div key={index} className="text-muted-foreground py-2">
                          {item.label}
                          <span className="text-xs ml-2">({item.tooltip})</span>
                        </div>
                      ) : (
                        <Link
                          key={index}
                          to={item.href!}
                          onClick={() => setMobileMenuOpen(false)}
                          className="py-2 hover:text-primary transition-colors"
                        >
                          {item.label}
                        </Link>
                      )
                    ))}
                  </div>
                </div>

                {/* Практика Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Практика</h3>
                  <div className="flex flex-col gap-2 ml-4">
                    {dropdownItems.practice.map((item, index) => (
                      item.disabled ? (
                        <div key={index} className="text-muted-foreground py-2">
                          {item.label}
                          <span className="text-xs ml-2">({item.tooltip})</span>
                        </div>
                      ) : (
                        <Link
                          key={index}
                          to={item.href!}
                          onClick={() => setMobileMenuOpen(false)}
                          className="py-2 hover:text-primary transition-colors"
                        >
                          {item.label}
                        </Link>
                      )
                    ))}
                  </div>
                </div>

                {/* Direct Links */}
                <div className="flex flex-col gap-2 border-t pt-4">
                  <Link
                    to="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 text-lg hover:text-primary transition-colors"
                  >
                    О Платформе
                  </Link>
                  <Link
                    to="/faq"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 text-lg hover:text-primary transition-colors"
                  >
                    FAQ
                  </Link>
                  <Link
                    to="/egeruses2"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 text-lg hover:text-primary transition-colors"
                  >
                    Сочинение
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialView="signin"
      />
    </header>
  );
}
