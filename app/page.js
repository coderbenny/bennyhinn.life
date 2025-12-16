// app/page.js
'use client';

import { useEffect, useState, useRef } from 'react';
import Navigation from '@/components/Navigation';
import SlideIndicators from '@/components/SlideIndicators';
import CursorGlow from '@/components/CursorGlow';
import HeroSlide from '@/components/slides/HeroSlide';
import TechStackSlide from '@/components/slides/TechStackSlide';
import ProjectsSlide from '@/components/slides/ProjectsSlide';
import ExperienceSlide from '@/components/slides/ExperienceSlide';
import ContactSlide from '@/components/slides/ContactSlide';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const totalSlides = 5;
  const containerRef = useRef(null);
  const lastScrollTime = useRef(0);

  useEffect(() => {
    // Detect mobile viewport (client-side only)
    const updateIsMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768);
      }
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);

    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleWheel = (e) => {
      // On mobile layouts we rely on natural scroll instead of slide snapping
      if (isMobile) return;

      e.preventDefault();
      const now = Date.now();
      
      if (isScrolling || now - lastScrollTime.current < 1000) return;
      
      lastScrollTime.current = now;
      setIsScrolling(true);

      if (e.deltaY > 0 && currentSlide < totalSlides - 1) {
        setCurrentSlide(prev => prev + 1);
      } else if (e.deltaY < 0 && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }

      setTimeout(() => setIsScrolling(false), 1000);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' && currentSlide < totalSlides - 1) {
        setCurrentSlide(prev => prev + 1);
      } else if (e.key === 'ArrowUp' && currentSlide > 0) {
        setCurrentSlide(prev => prev - 1);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlide, isScrolling, isMobile]);

  return (
    <>
      <CursorGlow position={mousePosition} />
      
      <Navigation 
        currentSlide={currentSlide} 
        onNavigate={setCurrentSlide} 
      />
      
      <SlideIndicators 
        total={totalSlides}
        current={currentSlide}
        onNavigate={setCurrentSlide}
      />

      <div 
        ref={containerRef}
        className="slides-container"
        style={isMobile ? {} : { transform: `translateY(-${currentSlide * 100}vh)` }}
      >
        <HeroSlide onNavigate={setCurrentSlide} />
        <TechStackSlide />
        <ProjectsSlide />
        <ExperienceSlide />
        <ContactSlide />
      </div>
    </>
  );
}