export default function ProjectCard({ name, url, description, tech, impact, delay, image }) {
  return (
    <div 
      className="group relative bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-[#ff6b6b] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col min-w-[300px] w-[85vw] md:w-[400px] snap-center shrink-0"
      style={{ animationDelay: `${delay}s`, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
    >
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-[#2a2a2a] border-b border-[#2a2a2a] group-hover:border-[#ff6b6b]/30 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent opacity-60 z-10" />
        <img 
          src={image} 
          alt={`${name} preview`} 
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* External Link Button - Positioned over image */}
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-[#ff6b6b] hover:border-[#ff6b6b] transition-all duration-300 group-hover:rotate-45"
          aria-label={`Visit ${name}`}
        >
          ↗
        </a>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#ff6b6b] to-[#ffa500] mb-2 truncate">
            {name}
          </h3>
          <p className="text-[#a0a0a0] text-sm leading-relaxed line-clamp-3">
            {description}
          </p>
        </div>

        <div className="mt-auto">
          <p className="text-[#ff6b6b] text-xs font-bold uppercase tracking-wider mb-4">
            {impact}
          </p>
          <div className="flex flex-wrap gap-2">
            {tech.map(t => (
              <span 
                key={t} 
                className="px-2.5 py-1 text-xs bg-black/30 border border-[#2a2a2a] rounded text-[#a0a0a0] group-hover:border-[#ff6b6b]/50 group-hover:text-white transition-colors whitespace-nowrap"
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