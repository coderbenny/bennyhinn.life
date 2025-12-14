// app/components/ui/TimelineItem.js
export default function TimelineItem({ title, period, company, achievements, current, delay }) {
  return (
    <div 
      className="timeline-item"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className={`timeline-marker ${current ? 'current' : ''}`} />
      <div className="timeline-content">
        <div className="timeline-header">
          <h3 className="timeline-title">{title}</h3>
          <span className="timeline-period">{period}</span>
        </div>
        <p className="timeline-company">{company}</p>
        <ul className="timeline-achievements">
          {achievements.map((achievement, idx) => (
            <li key={idx}>{achievement}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}