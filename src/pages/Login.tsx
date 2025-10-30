import { Link } from "react-router-dom";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SignInForm from "@/components/auth/SignInForm";
import useFlyingStarsBackground from "@/hooks/useFlyingStarsBackground";

const Login = () => {
  const bgRef = useRef<HTMLDivElement>(null);
  useFlyingStarsBackground(bgRef);
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 overflow-hidden" style={{ background: "linear-gradient(135deg, #1a1f36 0%, #2d3748 50%, #1a1f36 100%)" }}>
      <div ref={bgRef} className="absolute inset-0 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur border border-white/20 rounded-2xl shadow-xl">
          <CardHeader className="border-b border-white/20">
            <CardTitle className="text-[#1a1f36]">Вход</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <SignInForm onToggleForm={() => { /* optional: navigate to /register if needed */ }} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;


