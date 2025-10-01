import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/common/Navbar';
import Home from './Pages/Home';
import Dashboard from './Pages/Dashboard';
import Copilot from './Pages/Copilot'; // ← ADD THIS

// Placeholder components (we'll create these in next aims)
const Clusters = () => <div style={{ padding: '2rem', color: 'white' }}>Clusters - Coming Soon</div>;
const LiveFeed = () => <div style={{ padding: '2rem', color: 'white' }}>Live Feed - Coming Soon</div>;
const Reports = () => <div style={{ padding: '2rem', color: 'white' }}>Reports - Coming Soon</div>;

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/copilot" element={<Copilot />} /> {/* ← ADD THIS */}
        <Route path="/clusters" element={<Clusters />} />
        <Route path="/live" element={<LiveFeed />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;