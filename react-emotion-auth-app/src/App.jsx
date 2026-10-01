import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginForm } from './components/LoginForm';
import { EmotionDetector } from './components/EmotionDetector';
import { HistoryAnalytics } from './components/HistoryAnalytics';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route công khai */}
          <Route path="/login" element={<LoginForm />} />

          {/* Route cần đăng nhập: Camera nhận diện cảm xúc & Thống kê lịch sử */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<EmotionDetector />} />
            <Route path="/history" element={<HistoryAnalytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
