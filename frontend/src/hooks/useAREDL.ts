import { useEffect, useState } from 'react';

export interface Demon {
  id: string;
  name: string;
  difficulty: number;
  publisher: string;
  verifier: string;
  videoLink: string;
}

export interface Completion {
  id: string;
  userId: string;
  userName: string;
  demonId: string;
  videoLink: string;
  verified: boolean;
  verifiedBy?: string;
  completedAt: string;
}

export interface DemonList {
  id: string;
  name: string;
  ownerId: string;
  demons: Demon[];
  members: string[];
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  adminIds: string[];
  list: DemonList;
  completions: Completion[];
  members: string[];
  createdAt: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787';

// API Client - all backend calls go through here
const apiClient = {
  async fetchAllDemons(): Promise<Demon[]> {
    const res = await fetch(`${BACKEND_URL}/api/demons`);
    if (!res.ok) throw new Error('Failed to fetch demons');
    return res.json();
  },

  async searchDemons(query: string): Promise<Demon[]> {
    const res = await fetch(`${BACKEND_URL}/api/demons/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search demons');
    return res.json();
  },

  async fetchGroup(groupId: string): Promise<Group> {
    const res = await fetch(`${BACKEND_URL}/api/groups/${groupId}`);
    if (!res.ok) throw new Error('Failed to fetch group');
    return res.json();
  },

  async submitCompletion(groupId: string, demonId: string, videoLink: string, userId: string): Promise<Completion> {
    const res = await fetch(`${BACKEND_URL}/api/groups/${groupId}/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demonId, videoLink, userId })
    });
    if (!res.ok) throw new Error('Failed to submit completion');
    return res.json();
  },

  async verifyCompletion(groupId: string, completionId: string, verified: boolean, adminId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/groups/${groupId}/completions/${completionId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified, adminId })
    });
    if (!res.ok) throw new Error('Failed to verify completion');
  }
};

// Hooks
export const useDemonList = () => {
  const [demons, setDemons] = useState<Demon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllDemons = async () => {
    setLoading(true);
    try {
      const data = await apiClient.fetchAllDemons();
      setDemons(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const searchDemons = async (query: string) => {
    setLoading(true);
    try {
      const data = await apiClient.searchDemons(query);
      setDemons(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { demons, loading, error, fetchAllDemons, searchDemons };
};

export const useGroup = (groupId: string) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      setLoading(true);
      try {
        const data = await apiClient.fetchGroup(groupId);
        setGroup(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const submitCompletion = async (demonId: string, videoLink: string, userId: string) => {
    try {
      const newCompletion = await apiClient.submitCompletion(groupId, demonId, videoLink, userId);
      setGroup(g => g ? { ...g, completions: [...g.completions, newCompletion] } : null);
      return newCompletion;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  };

  const verifyCompletion = async (completionId: string, verified: boolean, adminId: string) => {
    try {
      await apiClient.verifyCompletion(groupId, completionId, verified, adminId);
      setGroup(g => g ? {
        ...g,
        completions: g.completions.map(c => c.id === completionId ? { ...c, verified } : c)
      } : null);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Unknown error');
    }
  };

  return { group, loading, error, submitCompletion, verifyCompletion };
};
