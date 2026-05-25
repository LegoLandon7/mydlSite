import '../styles/DemonCard.scss';
import type { Demon } from '../hooks/useAREDL';

interface Props {
  demon: Demon;
}

export default function DemonCard({ demon }: Props) {
  return (
    <div className="demon-card">
      <div className="demon-header">
        <h3>{demon.name}</h3>
        <span className="difficulty-badge">{demon.difficulty}%</span>
      </div>
      
      <div className="demon-meta">
        <p><strong>Publisher:</strong> {demon.publisher}</p>
        <p><strong>Verifier:</strong> {demon.verifier}</p>
      </div>

      {demon.videoLink && (
        <a href={demon.videoLink} target="_blank" rel="noreferrer" className="video-link">
          Watch Video
        </a>
      )}
    </div>
  );
}
