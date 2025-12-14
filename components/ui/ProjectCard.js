// app/components/ui/ProjectCard.js
export default function ProjectCard({ name, url, description, tech, impact, delay }) {
  return (
    <div 
      className="project-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="project-header">
        <h3 className="project-name">{name}</h3>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="project-link"
          aria-label={`Visit ${name}`}
        >
          ↗
        </a>
      </div>
      <p className="project-description">{description}</p>
      <p className="project-impact">{impact}</p>
      <div className="project-tech">
        {tech.map(t => (
          <span key={t} className="project-tech-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}