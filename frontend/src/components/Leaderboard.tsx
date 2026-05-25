import '../styles/Leaderboard.scss';
import type { Group } from '../hooks/useAREDL';

interface MemberStats {
  userId: string;
  userName: string;
  verified: number;
  unverified: number;
}

interface Props {
  group: Group;
}

export default function Leaderboard({ group }: Props) {
  // Calculate stats per member
  const memberMap = new Map<string, MemberStats>();

  group.completions.forEach(completion => {
    let memberStats = memberMap.get(completion.userId);
    if (!memberStats) {
      memberStats = {
        userId: completion.userId,
        userName: completion.userName,
        verified: 0,
        unverified: 0
      };
      memberMap.set(completion.userId, memberStats);
    }

    if (completion.verified) {
      memberStats.verified++;
    } else {
      memberStats.unverified++;
    }
  });

  const stats = Array.from(memberMap.values()).sort((a, b) => b.verified - a.verified);

  return (
    <div className="leaderboard">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Verified</th>
            <th>Pending</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat, idx) => (
            <tr key={stat.userId}>
              <td className="rank">#{idx + 1}</td>
              <td>{stat.userName}</td>
              <td className="verified">{stat.verified}</td>
              <td className="unverified">{stat.unverified}</td>
              <td className="total">{stat.verified + stat.unverified}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
