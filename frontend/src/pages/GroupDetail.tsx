import { useParams } from 'react-router-dom';
import { useState } from 'react';
import '../styles/GroupDetail.scss';
import { useGroup } from '../hooks/useAREDL';
import CompletionCard from '../components/CompletionCard';
import CompletionSubmit from '../components/CompletionSubmit';
import Leaderboard from '../components/Leaderboard';

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { group, loading, error, submitCompletion } = useGroup(groupId || '');
  const [activeTab, setActiveTab] = useState<'list' | 'leaderboard' | 'completions'>('list');
  // TODO: Get userId from Discord OAuth context
  const userId = 'current-user-id';

  const handleSubmitCompletion = async (demonId: string, videoLink: string) => {
    try {
      await submitCompletion(demonId, videoLink, userId);
    } catch (err) {
      console.error('Failed to submit completion:', err);
    }
  };

  if (loading) return <div>Loading group...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="group-detail">
      <div className="group-header">
        <h1>{group.name}</h1>
        <p>{group.members.length} members</p>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'list' ? 'active' : ''}
          onClick={() => setActiveTab('list')}
        >
          List
        </button>
        <button
          className={activeTab === 'leaderboard' ? 'active' : ''}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={activeTab === 'completions' ? 'active' : ''}
          onClick={() => setActiveTab('completions')}
        >
          Completions
        </button>
      </div>

      {activeTab === 'list' && (
        <div className="list-section">
          {group.list.demons.map((demon, idx) => (
            <div key={demon.id} className="list-item">
              <span className="rank">#{idx + 1}</span>
              <div className="demon-info">
                <h3>{demon.name}</h3>
                <p className="difficulty">Difficulty: {demon.difficulty}%</p>
              </div>
              <CompletionSubmit
                demonId={demon.id}
                onSubmit={(link) => handleSubmitCompletion(demon.id, link)}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 'leaderboard' && group && (
        <Leaderboard group={group} />
      )}

      {activeTab === 'completions' && (
        <div className="completions-section">
          {group.completions.map(completion => (
            <CompletionCard key={completion.id} completion={completion} demon={
              group.list.demons.find(d => d.id === completion.demonId)
            } />
          ))}
        </div>
      )}
    </div>
  );
}
