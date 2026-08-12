import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import './App.css';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import ScanPage from './pages/ScanPage';
import ProcessingPage from './pages/ProcessingPage';
import ResultsPage from './pages/ResultsPage';
import SuggestionPage from './pages/SuggestionPage';
import EwastePage from './pages/EwastePage';
import LogPage from './pages/LogPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { GridBackground, ScrollProgressBar } from './components/ui';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('SW registration failed:', err));
  });
}

function StartPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  return user && token ? <Navigate to="/home" replace /> : <LandingPage />;
}

// Animated route wrapper
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          <Route path="/" element={<StartPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
          <Route path="/processing" element={<ProtectedRoute><ProcessingPage /></ProtectedRoute>} />
          <Route path="/results/:scanId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/results/:scanId/suggestion/:suggestionId" element={<ProtectedRoute><SuggestionPage /></ProtectedRoute>} />
          <Route path="/results/:scanId/ewaste" element={<ProtectedRoute><EwastePage /></ProtectedRoute>} />
          <Route path="/log" element={<ProtectedRoute><LogPage /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute><CommunityPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <GridBackground />
      <ScrollProgressBar />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2800,
          style: {
            border: '1px solid #b8e6c1',
            borderRadius: '14px',
            color: '#1A1A2E',
            background: '#ffffff',
            boxShadow: '0 8px 24px rgba(82, 183, 136, 0.12)',
            fontFamily: '"Inter", sans-serif',
            fontSize: '14px',
            fontWeight: '600',
          },
          success: {
            iconTheme: { primary: '#52B788', secondary: '#FFFFFF' },
          },
          error: {
            iconTheme: { primary: '#E76F51', secondary: '#FFFFFF' },
          },
        }}
      />
      <AnimatedRoutes />
      <Analytics />
      <SpeedInsights />
    </Router>
  );
}

export default App;
