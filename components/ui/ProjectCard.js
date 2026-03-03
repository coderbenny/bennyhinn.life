// app/components/ui/ProjectCard.js
export default function ProjectCard({ name, url, description, tech, impact, delay, image }) {
  return (
    <div 
      className="project-card"
      style={{ animationDelay: `${delay}s`, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
    >
      {/* Image Container */}
      <div className="project-image-container">
        <div className="project-image-overlay" />
        <img 
          src={image} 
          alt={`${name} preview`} 
          className="project-image"
          loading="lazy"
        />
        
        {/* External Link Button */}
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="project-link-btn"
          aria-label={`Visit ${name}`}
        >
          ↗
        </a>
      </div>

      {/* Content */}
      <div className="project-card-body">
        <div className="project-card-info">
          <h3 className="project-name">
            {name}
          </h3>
          <p className="project-description">
            {description}
          </p>
        </div>

        <div className="project-card-footer">
          <p className="project-impact">
            {impact}
          </p>
          <div className="project-tech-tags">
            {tech.map(t => (
              <span 
                key={t} 
                className="project-tech-tag"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}