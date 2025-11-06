import { useState, useRef, useEffect, useCallback } from "react";
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
  onClose: () => void;
  onToggle: () => void;
}

const DropdownMenu = ({ title, items, isOpen, onClose, onToggle }: DropdownMenuProps) => {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Memoize handlers to prevent unnecessary re-renders
  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as Node;
    // Don't close if clicking the button or inside the dropdown
    if (
      ref.current?.contains(target) ||
      buttonRef.current?.contains(target)
    ) {
      return;
    }
    onClose();
  }, [onClose]);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  // Close dropdown when clicking outside or pressing Esc
  useEffect(() => {
    if (!isOpen) return;

    // Use click event (not mousedown) to avoid conflicts with button onClick
    // The button check in handleClickOutside ensures button clicks don't close the dropdown
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClickOutside, handleEscape]);

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  }, [onToggle]);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="flex items-center gap-1 px-3 py-2 text-white hover:text-yellow-400 transition-colors duration-200"
        aria-expanded={isOpen}
        aria-haspopup="true"
        type="button"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-64 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl z-[100]"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              {items.map((item, i) => (
                <div key={i} className="relative">
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
                      onClick={onClose}
                      role="menuitem"
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

  const handleLoginClick = () => {
    if (user) navigate("/mydb3");
    else setIsAuthModalOpen(true);
  };

  const handleToggle = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name));
  }, []);

  const handleClose = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  // ✅ Close dropdowns on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const dropdowns = {
    textbook: [
      { label: "ОГЭ математика", href: "/textbook" },
      { label: "ЕГЭ базовый уровень (математика)", href: "/textbook-base" },
      { label: "ЕГЭ профильный уровень (математика)", href: "/textbook-prof" },
    ],
    practice: [
      { label: "ОГЭ математика", href: "/questionbankoge" },
      { label: "ЕГЭ базовый уровень (математика)", href: "/questionbankegeb" },
      { label: "ЕГЭ профильный уровень (математика)", href: "/questionbankegep" },
    ],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/10 backdrop-blur">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between text-white">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <img
            src="https://kbaazksvkvnafrwtmkcw.supabase.co/storage/v1/render/image/public/avatars/logo100.png?width=112&height=112&format=webp"
            alt="EGEChat Logo"
            className="w-14 h-14"
            width="56"
            height="56"
          />
          <span className="font-bold text-xl text-white">EGEChat</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <DropdownMenu
            title="Учебник"
            items={dropdowns.textbook}
            isOpen={openDropdown === "textbook"}
            onToggle={() => handleToggle("textbook")}
            onClose={handleClose}
          />

          <DropdownMenu
            title="Практика"
            items={dropdowns.practice}
            isOpen={openDropdown === "practice"}
            onToggle={() => handleToggle("practice")}
            onClose={handleClose}
          />

          <Link to="/about" className="hover:text-yellow-400 transition-colors">
            О Платформе
          </Link>

          <Link to="/faq" className="hover:text-yellow-400 transition-colors">
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

        {/* Mobile Menu */}
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

      {/* Mobile Drawer */}
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

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <section>
                <h3 className="font-semibold text-lg mb-2">Учебник</h3>
                {dropdowns.textbook.map((item, i) => (
                  <Link
                    key={i}
                    to={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 hover:text-yellow-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-2">Практика</h3>
                {dropdowns.practice.map((item, i) => (
                  <Link
                    key={i}
                    to={item.href!}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 hover:text-yellow-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </section>

              <section className="border-t pt-4 space-y-2">
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-lg hover:text-yellow-400 transition-colors"
                >
                  О Платформе
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-lg hover:text-yellow-400 transition-colors"
                >
                  FAQ
                </Link>
                <Link
                  to="/egeruses2"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-lg hover:text-yellow-400 transition-colors"
                >
                  Сочинение
                </Link>
              </section>
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
