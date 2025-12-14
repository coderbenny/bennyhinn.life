// app/components/slides/ContactSlide.js
import SectionTitle from '../ui/SectionTitle';
import ContactMethod from '../ui/ContactMethod';

export default function ContactSlide() {
  const contacts = [
    {
      icon: '📧',
      label: 'Email',
      value: 'bhinnexclusive@gmail.com',
      href: 'mailto:bhinnexclusive@gmail.com'
    },
    {
      icon: '📱',
      label: 'Phone',
      value: '+254-114-092-304',
      href: 'tel:+254114092304'
    },
    {
      icon: '💼',
      label: 'LinkedIn',
      value: 'benny-mathew',
      href: 'https://www.linkedin.com/in/benny-mathew'
    },
    {
      icon: '💻',
      label: 'GitHub',
      value: 'coderbenny',
      href: 'https://github.com/coderbenny'
    }
  ];

  return (
    <section className="slide">
      <div className="slide-content">
        <SectionTitle number="04" title="LET'S BUILD TOGETHER" />
        
        <div className="contact-content">
          <p className="contact-description">
            I'm always interested in hearing about new opportunities, collaborations, or just having a chat about technology and innovation.
          </p>
          
          <div className="contact-methods">
            {contacts.map((contact, idx) => (
              <ContactMethod
                key={contact.label}
                {...contact}
                delay={idx * 0.1}
              />
            ))}
          </div>
          
          <div className="location">
            <span className="location-icon">📍</span>
            <span>Based in Nairobi, Kenya</span>
          </div>
        </div>
      </div>
    </section>
  );
}