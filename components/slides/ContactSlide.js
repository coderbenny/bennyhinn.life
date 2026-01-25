// app/components/slides/ContactSlide.js
import SectionTitle from '../ui/SectionTitle';

export default function ContactSlide() {
  const contacts = [
    {
      icon: '📧',
      label: 'Email',
      value: 'bhinnexclusive@gmail.com',
      href: 'mailto:bhinnexclusive@gmail.com',
      color: 'hover:border-blue-400 hover:text-blue-400'
    },
    {
      icon: '💬',
      label: 'WhatsApp',
      value: '+254 114 092 304',
      href: 'https://wa.me/254114092304',
      color: 'hover:border-green-500 hover:text-green-500'
    },
    {
      icon: '💼',
      label: 'LinkedIn',
      value: 'benny-mathew',
      href: 'https://www.linkedin.com/in/benny-mathew',
      color: 'hover:border-blue-600 hover:text-blue-600'
    },
    {
      icon: '💻',
      label: 'GitHub',
      value: 'coderbenny',
      href: 'https://github.com/coderbenny',
      color: 'hover:border-white hover:text-white'
    }
  ];

  return (
    <section className="slide overflow-y-auto">
      <div className="slide-content py-12 w-full max-w-5xl">
        <SectionTitle number="04" title="LET'S BUILD TOGETHER" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left Column: Description & Location */}
          <div className="space-y-8 animate-fadeInUp">
            <div className="space-y-6">
              <h3 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                Ready to turn your <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-coral-500 to-amber-500">
                  ideas into reality?
                </span>
              </h3>
              <p className="text-[#a0a0a0] text-lg leading-relaxed max-w-md">
                I'm always interested in hearing about new opportunities, collaborations, or just having a chat about technology and innovation.
              </p>
            </div>

            <div className="p-6 bg-[#141414] border border-[#2a2a2a] rounded-2xl inline-flex items-center gap-4 hover:border-[#ff6b6b] transition-colors group">
              <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📍
              </div>
              <div>
                <p className="text-sm text-[#a0a0a0] uppercase tracking-wider mb-0.5">Location</p>
                <p className="text-white font-semibold">Nairobi, Kenya</p>
              </div>
              <div className="ml-4 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <span className="flex items-center gap-2 text-xs font-medium text-green-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Open to Work
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((contact, idx) => (
              <a
                key={contact.label}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-col p-6 bg-[#141414] border border-[#2a2a2a] rounded-xl transition-all duration-300 hover:-translate-y-1 group ${contact.color}`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-xl mb-4 group-hover:bg-white/5 transition-colors">
                  {contact.icon}
                </div>
                <span className="text-[#a0a0a0] text-xs uppercase tracking-wider mb-1 font-medium">
                  {contact.label}
                </span>
                <span className="text-white font-semibold truncate group-hover:text-current transition-colors">
                  {contact.value}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}