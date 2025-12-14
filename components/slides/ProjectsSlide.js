// app/components/slides/ProjectsSlide.js
import SectionTitle from '../ui/SectionTitle';
import ProjectCard from '../ui/ProjectCard';

export default function ProjectsSlide() {
  const projects = [
    {
      name: 'Gemify Africa',
      url: 'https://www.gemify.africa',
      description: 'Discovery & booking platform connecting 50+ unique venues across Africa',
      tech: ['Next.js 14', 'TailwindCSS', 'MySQL', 'Flask', 'GCP'],
      impact: '200+ active listings, real-time booking system'
    },
    {
      name: 'Repairhub',
      url: 'https://www.repairhub.co.ke',
      description: 'Two-sided marketplace connecting clients with electronics technicians',
      tech: ['Next.js', 'Flask', 'MySQL', 'GCP'],
      impact: 'Real-time job matching, rating system'
    },
    {
      name: 'Tizi Plus Kenya',
      url: 'https://www.tiziplus.ke',
      description: 'Fitness tracking platform with subscription management',
      tech: ['Next.js', 'Flask', 'MySQL', 'Payment Integration'],
      impact: 'Full gym/client management system'
    },
    {
      name: 'Arbitredge',
      url: 'https://crypto-mu-sandy.vercel.app',
      description: 'P2P cryptocurrency trading platform with wallet integration',
      tech: ['Next.js', 'Flask', 'Binance API', 'JWT Auth'],
      impact: '1,000+ daily transactions handled'
    }
  ];

  return (
    <section className="slide">
      <div className="slide-content">
        <SectionTitle number="02" title="SELECTED WORK" />
        
        <div className="projects-grid">
          {projects.map((project, idx) => (
            <ProjectCard
              key={project.name}
              {...project}
              delay={idx * 0.15}
            />
          ))}
        </div>
      </div>
    </section>
  );
}