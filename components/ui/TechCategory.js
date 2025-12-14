// app/components/ui/TechCategory.js
export default function TechCategory({ category, technologies, delay }) {
  return (
    <div 
      className="tech-category"
      style={{ animationDelay: `${delay}s` }}
    >
      <h3 className="tech-category-title">{category}</h3>
      <div className="tech-tags">
        {technologies.map((tech, idx) => (
          <span 
            key={tech} 
            className="tech-tag"
            style={{ animationDelay: `${delay + (idx * 0.05)}s` }}
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}