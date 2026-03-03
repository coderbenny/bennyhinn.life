// app/components/slides/ProjectsSlide.js
import { useRef } from 'react';
import SectionTitle from "../ui/SectionTitle";
import ProjectCard from "../ui/ProjectCard";

export default function ProjectsSlide() {
  const containerRef = useRef(null);

  const projects = [
    {
      name: "Errands By Us",
      url: "https://www.errandsbyus.co.ke",
      description:
        "Focus on what matters most while we handle your errands. Kenya's most trusted errand agency.",
      tech: [
        "Next.js",
        "TailwindCSS",
        "Flask",
        "Payment Intergration",
        "JWT Auth",
        "MySQL",
        "GCP",
      ],
      impact: "500+ successful errands, 98% client satisfaction",
      image: "/projects/errands.png"
    },
    {
      name: "Gemify Africa",
      url: "https://www.gemify.africa",
      description:
        "Discovery & booking platform connecting 50+ unique venues across Africa",
      tech: [
        "Next.js",
        "TailwindCSS",
        "Flask",
        "Payment Intergration",
        "JWT Auth",
        "MySQL",
        "GCP",
      ],
      impact: "200+ active listings, real-time booking system",
      image: "/projects/gemify.png"
    },
    {
      name: "Repairhub",
      url: "https://www.repairhub.co.ke",
      description:
        "Two-sided marketplace connecting clients with electronics technicians",
      tech: [
        "Next.js",
        "TailwindCSS",
        "Flask",
        "Payment Intergration",
        "JWT Auth",
        "MySQL",
        "GCP",
      ],
      impact: "Real-time job matching, rating system",
      image: "/projects/repairhub.png"
    },
    {
      name: "Tizi Plus Kenya",
      url: "https://www.tiziplus.ke",
      description: "Fitness tracking platform with subscription management",
      tech: [
        "Next.js",
        "TailwindCSS",
        "Flask",
        "Payment Intergration",
        "JWT Auth",
        "MySQL",
        "GCP",
      ],
      impact: "Full gym/client management system",
      image: "/projects/tizi.png"
    },
    {
      name: "EABeats Official",
      url: "https://www.eabeatsofficial.co.ke",
      description:
        "Website for Music Producers to sell beats. Music lovers are also able to sign up, listen to and purchase their favorite beats.",
      tech: [
        "Next.js",
        "TailwindCSS",
        "Flask",
        "Payment Intergration",
        "JWT Auth",
        "MYSQL",
        "GCP",
      ],
      impact: "1,000+ daily transactions handled",
      image: "/projects/eabeats.png"
    },
  ];

  const scroll = (direction) => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section id="work" className="slide cursor-auto">
      <div className="slide-content relative">
        <div className="projects-header">
          <SectionTitle number="02" title="FEATURED PROJECTS" />
          
          {/* Desktop Navigation */}
          <div className="projects-nav-desktop">
            <button 
              onClick={() => scroll('left')}
              className="projects-scroll-btn"
              aria-label="Scroll left"
            >
              <span>←</span>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="projects-scroll-btn"
              aria-label="Scroll right"
            >
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="projects-carousel-wrapper">
          {/* Mobile scroll hint */}
          <div className="projects-swipe-hint">
            <span>Swipe to explore →</span>
          </div>

          <div 
            ref={containerRef}
            className="projects-carousel scrollbar-hide"
          >
            {projects.map((project, idx) => (
              <ProjectCard key={project.name} {...project} delay={idx * 0.1} />
            ))}
            <div className="projects-spacer" />
          </div>
        </div>
      </div>
    </section>
  );
}
