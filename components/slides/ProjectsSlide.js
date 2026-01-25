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
    <section className="slide cursor-auto">
      <div className="slide-content relative">
        <div className="flex justify-between items-center mb-0 md:mb-8 pr-4">
          <SectionTitle number="02" title="FEATURED PROJECTS" />
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4">
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center hover:border-[#ff6b6b] hover:bg-[#ff6b6b] hover:text-white transition-all duration-300 group"
              aria-label="Scroll left"
            >
              <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full border border-[#2a2a2a] flex items-center justify-center hover:border-[#ff6b6b] hover:bg-[#ff6b6b] hover:text-white transition-all duration-300 group"
              aria-label="Scroll right"
            >
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        <div className="relative group">
          {/* Mobile Navigation Overlays (visible on touch devices slightly) */}
          <button 
             onClick={() => scroll('left')}
             className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/50 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
          >
            ←
          </button>
          <button 
             onClick={() => scroll('right')}
             className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-black/50 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            →
          </button>

          <div 
            ref={containerRef}
            className="flex overflow-x-auto gap-8 w-full pb-12 pt-4 px-4 snap-x snap-mandatory scrollbar-hide -mx-4 md:mx-0"
          >
            {projects.map((project, idx) => (
              <ProjectCard key={project.name} {...project} delay={idx * 0.1} />
            ))}
            {/* Spacer for last item padding */}
            <div className="min-w-[1px] h-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
