
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { SimulationProvider } from "./contexts/SimulationProvider";
import Index from "./pages/Index";
import PrivateRoute from "./components/PrivateRoute";
import TopicsIndex from "@/pages/TopicsIndex";
import TopicPage from "@/pages/TopicPage"; // if not already
import LearningLayout from "@/components/layouts/LearningLayout";


const Profile = lazy(() => import("./pages/Profile"));
const DiagnosticTest = lazy(() => import("./pages/DiagnosticTest"));
const PracticeExercise = lazy(() => import("./pages/PracticeExercise"));
const DigitalTextbook = lazy(() => import("./pages/DigitalTextbook"));
const BookTest = lazy(() => import("./pages/BookTest"));
const Subscribe = lazy(() => import("./pages/Subscribe"));
const Pricing = lazy(() => import("./pages/Pricing"));
const FAQ = lazy(() => import("./pages/FAQ"));
const About = lazy(() => import("./pages/About"));
const EgeMathProf = lazy(() => import("./pages/EgeMathProf"));
const EgeMathBasic = lazy(() => import("./pages/EgeMathBasic"));
const OgeMath = lazy(() => import("./pages/OgeMath"));
const OgemathPractice = lazy(() => import("./pages/OgemathPractice"));
const OgemathMock = lazy(() => import("./pages/OgemathMock"));
const OgemathRevision = lazy(() => import("./pages/OgemathRevision"));
const EgemathbasicRevision = lazy(() => import("./pages/EgemathbasicRevision"));
const EgemathprofRevision = lazy(() => import("./pages/EgemathprofRevision"));
const EgemathbasicMock = lazy(() => import("./pages/EgemathbasicMock"));
const EgemathprofMock = lazy(() => import("./pages/EgemathprofMock"));
const OgemathProgress2 = lazy(() => import("./pages/OgemathProgress2"));
const EgemathbasicProgress = lazy(() => import("./pages/EgemathbasicProgress"));
const EgemathprofProgress = lazy(() => import("./pages/EgemathprofProgress"));
const PracticeByNumberOgemath = lazy(() => import("./pages/PracticeByNumberOgemath"));
const PracticeByNumberEgeBasicMath = lazy(() => import("./pages/PracticeByNumberEgeBasicMath"));
const PracticeByNumberEgeProfMath = lazy(() => import("./pages/PracticeByNumberEgeProfMath"));
const EgemathprofPractice = lazy(() => import("./pages/EgemathprofPractice"));
const EgemathbasicPractice = lazy(() => import("./pages/EgemathbasicPractice"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MyDb3 = lazy(() => import("./pages/MyDb3"));
const Homework = lazy(() => import("./pages/Homework"));
const HomeworkEgeb = lazy(() => import("./pages/HomeworkEgeb"));
const HomeworkEgeprof = lazy(() => import("./pages/HomeworkEgeprof"));
const HomeworkFipiPractice = lazy(() => import("./pages/HomeworkFipiPractice"));
const CellardLp2 = lazy(() => import("./pages/CellardLp2"));
const Egeruses = lazy(() => import("./pages/Egeruses"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <SimulationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            <Routes>
              {/* pages WITHOUT the layout (plain) */}
              <Route path="/" element={<Index />} />
              <Route path="/subscribe" element={<Subscribe />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
          
              {/* pages WITH the layout (shared gradient + flying symbols) */}
              <Route element={<LearningLayout />}>
                <Route path="/module/:moduleSlug" element={<ModulePage />} />
                <Route path="/module/:moduleSlug/topic/:topicId" element={<TopicPage />} />
                <Route path="/cellard-lp2" element={<CellardLp2 />} />
          
                {/* put any other pages that should share the look here: */}
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
          
              {/* protected pages – wrap in layout too if you want the same background */}
              <Route element={<PrivateRoute />}>
              {/* With layout */}
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

            </TooltipProvider>
          </SimulationProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
