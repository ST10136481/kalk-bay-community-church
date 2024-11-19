import React from 'react';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Events from './components/Events';
import Sermons from './components/Sermons';
import Contact from './components/Contact';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      <Navbar />
      <Hero />
      <Events />
      <Sermons />
      <Contact />
    </div>
  );
}

export default App;