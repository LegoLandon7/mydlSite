import { useState } from 'react';
import '../styles/Dashboard.scss';

interface UserGroup {
  id: string;
  name: string;
  memberCount: number;
  completions: number;
}

export default function Dashboard() {
  const [groups] = useState<UserGroup[]>([]);

  // TODO: Fetch user's groups from backend
  // useEffect(() => {
  //   const fetchGroups = async () => {
  //     const res = await fetch('/api/user/groups');
  //     const data = await res.json();
  //     setGroups(data);
  //   };
  //   fetchGroups();
  // }, []);

  return (
    <div className="dashboard">
      <h1>My Groups</h1>

      {groups.length === 0 && (
        <div className="empty-state">
          <p>You haven't joined any groups yet</p>
          <button>Create a Group</button>
        </div>
      )}

      <div className="groups-list">
        {groups.map(group => (
          <div key={group.id} className="group-card">
            <h2>{group.name}</h2>
            <p>{group.memberCount} members</p>
            <p>{group.completions} completions</p>
          </div>
        ))}
      </div>
    </div>
  );
}
