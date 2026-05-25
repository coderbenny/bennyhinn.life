// app/page.js
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import SlideIndicators from '@/components/SlideIndicators';
import HeroSlide from '@/components/slides/HeroSlide';
import TechStackSlide from '@/components/slides/TechStackSlide';
import ProjectsSlide from '@/components/slides/ProjectsSlide';
import ExperienceSlide from '@/components/slides/ExperienceSlide';
import ContactSlide from '@/components/slides/ContactSlide';

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const totalSlides = 5;
  const containerRef = useRef(null);
  const lastScrollTime = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const slideIds = ['about', 'stack', 'work', 'experience', 'contact'];

  useEffect(() => {
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

  const handleNavigate = useCallback((idx) => {
    if (idx < 0 || idx >= totalSlides) return;
    
    setCurrentSlide(idx);
    
    if (isMobile) {
      const targetId = slideIds[idx];
      const element = document.getElementById(targetId);
      if (element) {
        // Simple scrollIntoView with offset for fixed nav
        const offset = 80; // height of nav + extra breathing room
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [isMobile, totalSlides, slideIds]);

  // Sync active slide state with scroll position on mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const scrollPos = window.scrollY;
      const winHeight = window.innerHeight;
      
      // Calculate which slide is currently in view more accurately
      const sections = slideIds.map(id => document.getElementById(id));
      const currentSectionIndex = sections.findIndex((section, i) => {
        if (!section) return false;
        const rect = section.getBoundingClientRect();
        return rect.top <= winHeight / 2 && rect.bottom >= winHeight / 2;
      });

      if (currentSectionIndex !== -1 && currentSectionIndex !== currentSlide) {
        setCurrentSlide(currentSectionIndex);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, currentSlide, slideIds]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (isMobile) return;

      e.preventDefault();
      const now = Date.now();
      
      if (isScrolling || now - lastScrollTime.current < 1000) return;
      
      lastScrollTime.current = now;
      setIsScrolling(true);

      if (e.deltaY > 0 && currentSlide < totalSlides - 1) {
        handleNavigate(currentSlide + 1);
      } else if (e.deltaY < 0 && currentSlide > 0) {
        handleNavigate(currentSlide - 1);
      }

      setTimeout(() => setIsScrolling(false), 1000);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' && currentSlide < totalSlides - 1) {
        handleNavigate(currentSlide + 1);
      } else if (e.key === 'ArrowUp' && currentSlide > 0) {
        handleNavigate(currentSlide - 1);
      }
    };

    const handleTouchStart = (e) => {
      touchStartY.current = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      if (isMobile) return; 
      
      touchEndY.current = e.changedTouches[0].screenY;
      const swipeDistance = touchStartY.current - touchEndY.current;
      const minSwipe = 50;

      if (Math.abs(swipeDistance) < minSwipe) return;

      const now = Date.now();
      if (isScrolling || now - lastScrollTime.current < 1000) return;
      lastScrollTime.current = now;
      setIsScrolling(true);

      if (swipeDistance > 0 && currentSlide < totalSlides - 1) {
        handleNavigate(currentSlide + 1);
      } else if (swipeDistance < 0 && currentSlide > 0) {
        handleNavigate(currentSlide - 1);
      }

      setTimeout(() => setIsScrolling(false), 1000);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentSlide, isScrolling, isMobile, handleNavigate, totalSlides]);

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

      <div 
        ref={containerRef}
        className="slides-container"
        style={isMobile ? {} : { transform: `translateY(-${currentSlide * 100}vh)` }}
      >
        <HeroSlide onNavigate={handleNavigate} />
        <TechStackSlide />
        <ProjectsSlide />
        <ExperienceSlide />
        <ContactSlide />
      </div>
    </>
  );
}