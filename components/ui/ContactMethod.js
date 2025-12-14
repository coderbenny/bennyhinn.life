// app/components/ui/ContactMethod.js
export default function ContactMethod({ icon, label, value, href, delay }) {
  return (
    <a 
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="contact-method"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className="contact-icon">{icon}</span>
      <div>
        <p className="contact-label">{label}</p>
        <p className="contact-value">{value}</p>
      </div>
    </a>
  );
}