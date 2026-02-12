import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import AdminPanel from './AdminPanel';
import { AuctionProvider } from './context/AuctionContext';
import './App.css';

function App() {
  return (
    <AuctionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </AuctionProvider>
  );
}

export default App;