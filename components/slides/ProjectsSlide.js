// app/components/slides/ProjectsSlide.js
import SectionTitle from "../ui/SectionTitle";
import ProjectCard from "../ui/ProjectCard";

export default function ProjectsSlide() {
  const projects = [
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
    },
  ];

  return (
    <section className="slide">
      <div className="slide-content">
        <SectionTitle number="02" title="SELECTED WORK" />

        <div className="projects-grid">
          {projects.map((project, idx) => (
            <ProjectCard key={project.name} {...project} delay={idx * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}
