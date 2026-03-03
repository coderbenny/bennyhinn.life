// app/components/ui/CertificationItem.js
export default function CertificationItem({ icon, title, org }) {
  return (
    <div className="cert-item">
      <span className="cert-icon">{icon}</span>
      <div className="cert-info">
        <p className="cert-title">{title}</p>
        <p className="cert-org">{org}</p>
      </div>
    </div>
  );
}