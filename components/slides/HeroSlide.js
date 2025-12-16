// app/components/slides/HeroSlide.js
import React from "react";
import StatItem from "../ui/StatItem";
import Button from "../ui/Button";

export default function HeroSlide({ onNavigate }) {
  const stats = [
    { number: "10+", label: "Production Apps" },
    { number: "2+", label: "Years Experience" },
    { number: "99.5%", label: "Uptime Achieved" },
  ];

  return (
    <section className="slide">
      <div className="slide-content">
        <div className="hero-layout">
          <div className="hero-content">
            <div className="glitch-wrapper">
              <h1 className="hero-title">BENNY HINN</h1>
              <h1 className="hero-title glitch-text" data-text="BENNY HINN">
                BENNY HINN
              </h1>
            </div>

            <div className="hero-subtitle-wrapper">
              <h2 className="hero-subtitle">Full Stack Engineer</h2>
              <div className="hero-accent-line" />
            </div>

            <p className="hero-description">
              Building scalable VAS solutions & marketplace platforms for
              Africa&apos;s digital future. Currently architecting telecom
              services at{" "}
              <span className="text-coral-500 font-semibold">Zuri Health</span>,
              supporting 50,000+ monthly healthcare transactions.
            </p>

            <div className="hero-stats">
              {stats.map((stat, idx) => (
                <React.Fragment key={stat.label}>
                  <StatItem
                    index={idx}
                    number={stat.number}
                    label={stat.label}
                  />
                  {idx < stats.length - 1 && <div className="stat-divider" />}
                </React.Fragment>
              ))}
            </div>

            <div className="hero-cta">
              <Button variant="primary" onClick={() => onNavigate(4)}>
                Let&apos;s Connect
              </Button>
              <Button variant="secondary" onClick={() => onNavigate(2)}>
                View Work
              </Button>
            </div>
          </div>

          <div className="hero-image-wrapper">
            <div className="hero-image-container">
              <img
                src="/benny-logo.jpeg"
                alt="Benny Hinn"
                className="hero-image"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
