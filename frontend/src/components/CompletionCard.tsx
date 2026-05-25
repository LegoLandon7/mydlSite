import '../styles/CompletionCard.scss';
import type { Completion, Demon } from '../hooks/useAREDL';

interface Props {
  completion: Completion;
  demon?: Demon;
}

export default function CompletionCard({ completion, demon }: Props) {
  return (
    <div className={`completion-card ${completion.verified ? 'verified' : 'unverified'}`}>
      <div className="completion-header">
        <h4>{demon?.name || 'Unknown Demon'}</h4>
        <span className={`status-badge ${completion.verified ? 'verified' : 'pending'}`}>
          {completion.verified ? '✓ Verified' : '⏳ Pending'}
        </span>
      </div>

      <div className="completion-meta">
        <p><strong>By:</strong> {completion.userName}</p>
        <p><strong>Date:</strong> {new Date(completion.completedAt).toLocaleDateString()}</p>
        {completion.verified && completion.verifiedBy && (
          <p><strong>Verified by:</strong> {completion.verifiedBy}</p>
        )}
      </div>

      {completion.videoLink && (
        <a href={completion.videoLink} target="_blank" rel="noreferrer" className="video-link">
          Watch Proof
        </a>
      )}
    </div>
  );
}
