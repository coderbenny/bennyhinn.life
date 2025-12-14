// app/components/ui/SectionTitle.js
export default function SectionTitle({ number, title }) {
  return (
    <h2 className="section-title">
      <span className="title-number">{number}</span>
      {title}
    </h2>
  );
}