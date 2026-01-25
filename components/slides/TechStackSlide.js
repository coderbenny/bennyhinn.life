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

  const competencies = [
    {
      icon: '💻',
      title: 'Software Engineering',
      desc: 'Building scalable, production-grade applications with modern architectures.',
      tags: ['System Design', 'Clean Code', 'Scalability']
    },
    {
      icon: '🤖',
      title: 'Artificial Intelligence',
      desc: 'Integrating AI/ML solutions to solve complex business problems.',
      tags: ['LLMs', 'Computer Vision', 'Predictive Analytics']
    },
    {
      icon: '🚀',
      title: 'Entrepreneurship',
      desc: 'Transforming innovative ideas into viable, market-ready products.',
      tags: ['Product Strategy', 'Growth', 'MVP Dev']
    }
  ];

  return (
    <section className="slide overflow-y-auto">
      <div className="slide-content py-12">
        <SectionTitle number="01" title="TECHNOLOGY STACK" />
        
        <div className="tech-grid mb-12">
          {Object.entries(techStack).map(([category, technologies], idx) => (
            <TechCategory
              key={category}
              category={category}
              technologies={technologies}
              delay={idx * 0.1}
            />
          ))}
        </div>
        
        <div className="mt-16">
          <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <span className="text-[#ff6b6b]">01.5</span>
            <span className="bg-gradient-to-r from-white to-[#a0a0a0] bg-clip-text text-transparent">CORE COMPETENCIES</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {competencies.map((item, idx) => (
              <div 
                key={item.title}
                className="group p-6 bg-[#141414] border border-[#2a2a2a] rounded-xl hover:border-[#ff6b6b] transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <h4 className="text-xl font-bold text-white mb-2 group-hover:text-[#ff6b6b] transition-colors">{item.title}</h4>
                <p className="text-[#a0a0a0] text-sm leading-relaxed mb-4">{item.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-[#2a2a2a] rounded text-[#a0a0a0] group-hover:text-white transition-colors">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}