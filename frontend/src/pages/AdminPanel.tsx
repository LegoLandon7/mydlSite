import { useParams } from 'react-router-dom';
import '../styles/AdminPanel.scss';
import { useGroup } from '../hooks/useAREDL';
import CompletionCard from '../components/CompletionCard';

export default function AdminPanel() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group, verifyCompletion } = useGroup(groupId || '');
  // TODO: Get adminId from Discord OAuth context
  const adminId = 'current-admin-id';

  const unverifiedCompletions = group?.completions.filter(c => !c.verified) || [];

  const handleVerify = async (completionId: string) => {
    try {
      await verifyCompletion(completionId, true, adminId);
    } catch (err) {
      console.error('Failed to verify:', err);
    }
  };

  const handleReject = async (completionId: string) => {
    try {
      await verifyCompletion(completionId, false, adminId);
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  return (
    <div className="admin-panel">
      <h1>Admin Panel - {group?.name}</h1>

      <div className="pending-section">
        <h2>Pending Verifications ({unverifiedCompletions.length})</h2>

        {unverifiedCompletions.length === 0 && (
          <p>No pending completions</p>
        )}

        <div className="completions-list">
          {unverifiedCompletions.map(completion => {
            const demon = group?.list.demons.find(d => d.id === completion.demonId);
            return (
              <div key={completion.id} className="completion-pending">
                <CompletionCard completion={completion} demon={demon} />
                <div className="actions">
                  <a href={completion.videoLink} target="_blank" rel="noreferrer" className="video-link">
                    Watch Video
                  </a>
                  <button onClick={() => handleVerify(completion.id)} className="verify-btn">
                    Verify
                  </button>
                  <button onClick={() => handleReject(completion.id)} className="reject-btn">
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
