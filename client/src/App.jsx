import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './layouts/MainLayout';
import { Loader2 } from 'lucide-react';

const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Review = React.lazy(() => import('./pages/Review'));
const History = React.lazy(() => import('./pages/History'));
const ReviewDetails = React.lazy(() => import('./pages/ReviewDetails'));
const ProjectWorkspace = React.lazy(() => import('./pages/ProjectWorkspace'));
const GithubWorkspace = React.lazy(() => import('./pages/GithubWorkspace'));
const GithubCallback = React.lazy(() => import('./pages/GithubCallback'));

const LoadingSpinner = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster 
            position="top-right" 
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          }} 
        />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes inside MainLayout */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/review" element={<Review />} />
                <Route path="/workspace" element={<ProjectWorkspace />} />
                <Route path="/workspace/:id" element={<ProjectWorkspace />} />
                <Route path="/github" element={<GithubWorkspace />} />
                <Route path="/github/callback" element={<GithubCallback />} />
                <Route path="/github/:id" element={<GithubWorkspace />} />
                <Route path="/history" element={<History />} />
                <Route path="/history/:id" element={<ReviewDetails />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
