// app/components/slides/ExperienceSlide.js
import SectionTitle from '../ui/SectionTitle';
import TimelineItem from '../ui/TimelineItem';
import { EXPERIENCE as experiences } from '@/constants/experience';

export default function ExperienceSlide() {
  return (
    <section id="experience" className="slide overflow-y-auto">
      <div className="slide-content py-12">
        <SectionTitle number="03" title="PROFESSIONAL JOURNEY" />
        
        <div className="timeline">
          {experiences.map((exp, idx) => (
            <TimelineItem
              key={exp.title}
              {...exp}
              delay={idx * 0.2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}