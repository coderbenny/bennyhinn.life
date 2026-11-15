// app/components/slides/TechStackSlide.js
import SectionTitle from '../ui/SectionTitle';
import TechCategory from '../ui/TechCategory';
import CertificationItem from '../ui/CertificationItem';
import { TECH_STACK as techStack, COMPETENCIES as competencies } from '@/constants/skills';

export default function TechStackSlide() {
  return (
    <section id="stack" className="slide overflow-y-auto">
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
          <h3 className="competencies-subtitle">
            <span className="text-[#ff6b6b]">01.5</span>
            <span className="bg-gradient-to-r from-white to-[#a0a0a0] bg-clip-text text-transparent">CORE COMPETENCIES</span>
          </h3>
          
          <div className="competencies-grid">
            {competencies.map((item, idx) => (
              <div 
                key={item.title}
                className="competency-card"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className="competency-icon">{item.icon}</div>
                <h4 className="competency-title">{item.title}</h4>
                <p className="competency-desc">{item.desc}</p>
                <div className="competency-tags">
                  {item.tags.map(tag => (
                    <span key={tag} className="competency-tag">
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