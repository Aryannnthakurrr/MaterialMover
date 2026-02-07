import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Seller from './pages/Seller';
import Admin from './pages/Admin';
import { ToastProvider } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/seller" element={<Seller />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </ToastProvider>
  );
}
