// App.tsx
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import Index from "./pages/Index";
import PrivateRoute from "./components/PrivateRoute";
import TopicsIndex from "@/pages/TopicsIndex";
import TopicPage from "@/pages/TopicPage";
import LearningLayout from "@/components/layouts/LearningLayout";
import { SimulationProvider } from "@/contexts/SimulationProvider"; // ✅ use it

const Profile = lazy(() => import("./pages/Profile"));
// ... all your other lazy imports ...

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            {/* ✅ Mount the SimulationProvider ONCE, outside pages */}
            <SimulationProvider>
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
                <Routes>
                  {/* Public, no layout */}
                  <Route path="/" element={<Index />} />
                  <Route path="/subscribe" element={<Subscribe />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/about" element={<About />} />

                  {/* Public, with shared layout */}
                  <Route element={<LearningLayout />}>
                    <Route path="/module/:moduleSlug" element={<ModulePage />} />
                    <Route path="/module/:moduleSlug/topic/:topicId" element={<TopicPage />} />
                    <Route path="/cellard-lp2" element={<CellardLp2 />} />
                    <Route path="/textbook" element={<DigitalTextbook />} />
                    <Route path="/book-test" element={<BookTest />} />
                    <Route path="/ogemath" element={<OgeMath />} />
                    <Route path="/ogemath-practice" element={<OgemathPractice />} />
                    <Route path="/ogemath-mock" element={<OgemathMock />} />
                    <Route path="/ogemath-revision" element={<OgemathRevision />} />
                    <Route path="/ogemath-progress2" element={<OgemathProgress2 />} />
                    <Route path="/egemathbasic-progress" element={<EgemathbasicProgress />} />
                    <Route path="/egemathbasic-mock" element={<EgemathbasicMock />} />
                    <Route path="/egemathprof-mock" element={<EgemathprofMock />} />
                    <Route path="/egemathprof-progress" element={<EgemathprofProgress />} />
                    <Route path="/practice-by-number-ogemath" element={<PracticeByNumberOgemath />} />
                    <Route path="/practice-by-number-egebasicmath" element={<PracticeByNumberEgeBasicMath />} />
                    <Route path="/practice-by-number-egeprofmath" element={<PracticeByNumberEgeProfMath />} />
                    <Route path="/egemathprof-practice" element={<EgemathprofPractice />} />
                    <Route path="/egemathbasic-practice" element={<EgemathbasicPractice />} />
                    <Route path="/egemathbasic-revision" element={<EgemathbasicRevision />} />
                    <Route path="/egemathprof-revision" element={<EgemathprofRevision />} />
                    <Route path="/egemathprof" element={<EgeMathProf />} />
                    <Route path="/egemathbasic" element={<EgeMathBasic />} />
                    <Route path="/egeruses" element={<Egeruses />} />
                  </Route>

                  {/* Protected (also wrapped in layout) */}
                  <Route element={<PrivateRoute />}>
                    <Route element={<LearningLayout />}>
                      <Route path="/mydb3" element={<MyDb3 />} />
                      <Route path="/topics" element={<TopicsIndex />} />
                      <Route path="/topic/:topicNumber" element={<TopicPage />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/diagnostic" element={<DiagnosticTest />} />
                      <Route path="/practice" element={<PracticeExercise />} />
                      <Route path="/homework" element={<Homework />} />
                      <Route path="/homework-egeb" element={<HomeworkEgeb />} />
                      <Route path="/homework-egeprof" element={<HomeworkEgeprof />} />
                      <Route path="/homework-fipi-practice" element={<HomeworkFipiPractice />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SimulationProvider>
            {/* The SimulationModal will render right after children, so it appears above all pages */}
          </TooltipProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
