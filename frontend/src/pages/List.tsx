import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import LevelsList from '../components/LevelsList';
import '../components/LevelsList.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type Level = {
    level_id: number;
    name: string;
    position: number;
    link: string;
};

export default function List() {
    const [levels, setLevels] = useState<Level[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = useParams();

    useEffect(() => { fetchLevels(); }, []);

    useEffect(() => {
        if (id && levels.length > 0)
            setSelectedLevel(levels.find(l => l.level_id.toString() === id) || null);
    }, [id, levels]);

    const fetchLevels = async () => {
        try {
            const response = await fetch(`${API_URL}/list/`, { credentials: 'include' });
            if (!response.ok) throw new Error(`Failed to fetch levels: ${response.status}`);
            setLevels(await response.json());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load levels');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LevelsList
            levels={levels}
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            loading={loading}
            error={error}
            onRetry={fetchLevels}
        />
    );
}