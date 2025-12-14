// app/components/slides/TechStackSlide.js
import SectionTitle from '../ui/SectionTitle';
import TechCategory from '../ui/TechCategory';
import CertificationItem from '../ui/CertificationItem';

export default function TechStackSlide() {
  const techStack = {
    Frontend: ['React.js', 'Next.js 14+', 'TypeScript', 'TailwindCSS'],
    Backend: ['Python', 'Flask', 'Django', 'Node.js'],
    Database: ['PostgreSQL', 'MySQL', 'MongoDB'],
    DevOps: ['Docker', 'GCP', 'Firebase', 'CI/CD'],
    Telecom: ['SMS Gateway', 'MMS', 'IVR', 'USSD']
  };

  const certifications = [
    {
      icon: '🎓',
      title: 'Software Engineering',
      org: 'Moringa School • 2024'
    },
    {
      icon: '🤖',
      title: 'Artificial Intelligence',
      org: 'Moringa School • 2025'
    },
    {
      icon: '🚀',
      title: 'Entrepreneurship & Prototyping',
      org: 'Futurize Founders Academy • 2025'
    }
  ];

  return (
    <section className="slide">
      <div className="slide-content">
        <SectionTitle number="01" title="TECHNOLOGY STACK" />
        
        <div className="tech-grid">
          {Object.entries(techStack).map(([category, technologies], idx) => (
            <TechCategory
              key={category}
              category={category}
              technologies={technologies}
              delay={idx * 0.1}
            />
          ))}
        </div>
        
        <div className="certifications">
          {certifications.map((cert, idx) => (
            <CertificationItem
              key={cert.title}
              {...cert}
            />
          ))}
        </div>
      </div>
    </section>
  );
}