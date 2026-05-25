// app/page.js
'use client';

import { useEffect, useState, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import SlideIndicators from '@/components/SlideIndicators';
import HeroSlide from '@/components/slides/HeroSlide';
import TechStackSlide from '@/components/slides/TechStackSlide';
import ProjectsSlide from '@/components/slides/ProjectsSlide';
import ExperienceSlide from '@/components/slides/ExperienceSlide';
import ContactSlide from '@/components/slides/ContactSlide';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const totalSlides = 5;
  const slideIds = ['about', 'stack', 'work', 'experience', 'contact'];

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 768);
      }
    };
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const handleNavigate = useCallback((idx) => {
    if (idx < 0 || idx >= totalSlides) return;
    
    setCurrentSlide(idx);
    
    const targetId = slideIds[idx];
    const element = document.getElementById(targetId);
    if (element) {
      const offset = 0; 
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }, [totalSlides, slideIds]);

  useEffect(() => {
    const handleScroll = () => {
      const winHeight = window.innerHeight;
      
      const sections = slideIds.map(id => document.getElementById(id));
      let currentSectionIndex = 0;
      
      sections.forEach((section, index) => {
        if (!section) return;
        const rect = section.getBoundingClientRect();
        if (rect.top <= winHeight / 2) {
          currentSectionIndex = index;
        }
      });

      if (currentSectionIndex !== currentSlide) {
        setCurrentSlide(currentSectionIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentSlide, slideIds]);

  return (
    <>
      <Navigation 
        currentSlide={currentSlide} 
        onNavigate={handleNavigate} 
      />
      
      {!isMobile && (
        <SlideIndicators 
          total={totalSlides}
          current={currentSlide}
          onNavigate={handleNavigate}
        />
      )}

      <div className="slides-container">
        <HeroSlide onNavigate={handleNavigate} />
        <TechStackSlide />
        <ProjectsSlide />
        <ExperienceSlide />
        <ContactSlide />
      </div>
    </>
  );
}