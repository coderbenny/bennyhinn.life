// app/components/slides/ExperienceSlide.js
import SectionTitle from '../ui/SectionTitle';
import TimelineItem from '../ui/TimelineItem';

export default function ExperienceSlide() {
  const experiences = [
    {
      title: 'VAS Engineer',
      period: 'Jul 2024 - Present',
      company: 'Zuri Health • Nairobi, Kenya',
      achievements: [
        'Architected 10+ telecom VAS solutions (SMS, MMS, IVR, USSD) serving 50,000+ monthly transactions',
        'Reduced platform downtime by 40% through proactive monitoring and automated error detection',
        'Integrated with 5 major telecom providers achieving 99.5% uptime for critical healthcare notifications',
        'Optimized delivery performance resulting in 25% speed improvement and 15% cost reduction'
      ],
      current: true
    },
    {
      title: 'Studio Technical Operator',
      period: 'Jul 2020 - Nov 2022',
      company: 'Al Huda TV & Switch TV • Nairobi, Kenya',
      achievements: [
        'Directed 20+ live productions with zero critical failures, maintaining 99.8% quality standards',
        'Managed multi-camera operations for programming serving 100,000+ viewers',
        'Reduced post-production corrections by 35% through quality control procedures'
      ],
      current: false
    }
  ];

  return (
    <section className="slide">
      <div className="slide-content">
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