import React from 'react';
import { useInView } from 'react-intersection-observer';

const Hero = () => {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <div className="relative h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1505672678657-cc7037095e60?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
      </div>
      
      <div
        ref={ref}
        className={`relative h-full flex items-center justify-center text-center px-4 transition-opacity duration-1000 ${
          inView ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Welcome to Kalk Bay Community Church
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8">
            Join us in worship as we grow together in faith, hope, and love.
          </p>
          <button
            onClick={() => document.getElementById('join-us')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors duration-300"
          >
            Join Our Community
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;