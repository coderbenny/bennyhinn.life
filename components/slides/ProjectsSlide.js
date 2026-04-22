// app/components/slides/ProjectsSlide.js
"use client";

import { useRef, useState, useEffect } from "react";
import SectionTitle from "../ui/SectionTitle";
import { PROJECTS } from "../../constants/projects";
import ProjectCard from "../ui/ProjectCard";

export default function ProjectsSlide() {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const projects = PROJECTS;


  // Track scroll position to update pagination dots
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const width = container.offsetWidth;
      const scrollPos = container.scrollLeft;
      const index = Math.round(scrollPos / (width * 0.8)); // Adjust multiplier based on card width
      if (index !== activeIndex && index < projects.length) {
        setActiveIndex(index);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, projects.length]);

  const scroll = (direction) => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      const scrollAmount = direction === "left" ? -width * 0.8 : width * 0.8;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const scrollToProject = (index) => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      containerRef.current.scrollTo({
        left: index * width * 0.8,
        behavior: "smooth",
      });
    }
  };

  return (
    <section id="work" className="slide cursor-auto">
      <div className="slide-content relative">
        <div className="projects-header">
          <SectionTitle number="02" title="FEATURED PROJECTS" />

          <div className="projects-nav-desktop">
            <button
              onClick={() => scroll("left")}
              className="projects-scroll-btn"
              aria-label="Scroll left"
            >
              <span>←</span>
            </button>
            <button
              onClick={() => scroll("right")}
              className="projects-scroll-btn"
              aria-label="Scroll right"
            >
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="projects-carousel-wrapper">
          <div className="projects-swipe-hint">
            <span className="swipe-chevron">←</span>
            <span>Swipe to explore</span>
            <span className="swipe-chevron">→</span>
          </div>

          <div ref={containerRef} className="projects-carousel scrollbar-hide">
            {projects.map((project, idx) => (
              <ProjectCard key={project.name} {...project} delay={idx * 0.1} />
            ))}
            <div className="projects-spacer" />
          </div>

          {/* Pagination dots for mobile */}
          <div className="projects-pagination">
            {projects.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToProject(idx)}
                className={`pagination-dot ${activeIndex === idx ? "active" : ""}`}
                aria-label={`Go to project ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
