import { useState, useEffect } from 'react';
import './LevelsList.scss';

type Level = {
    level_id: number;
    name: string;
    position: number;
    link: string;
    description?: string;
};

type LevelsListProps = {
    levels: Level[];
    selectedLevel: Level | null;
    onSelectLevel: (level: Level) => void;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
};

const THUMBNAIL_BASE = 'https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full';

export default function LevelsList({ levels, selectedLevel, onSelectLevel, loading, error, onRetry }: LevelsListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filtered, setFiltered] = useState(levels);

    useEffect(() => {
        setFiltered(levels.filter(level =>
            level.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            level.position.toString().includes(searchQuery) ||
            level.level_id.toString().includes(searchQuery)
        ));
    }, [searchQuery, levels]);

    const handleLevelClick = (level: Level) => {
        onSelectLevel(level);
        window.history.pushState({}, '', `/list/${level.level_id}`);
    };

    if (loading) {
        return (
            <div className="list-container">
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading levels...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="list-container">
                <div className="error-state">
                    <p className="error-title">⚠️ Failed to Load Levels</p>
                    <p className="error-message">{error}</p>
                    <button onClick={onRetry} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="list-container">
            <div className="levels-list-container">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search by name, position, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                </div>

                <div className="levels-list">
                    {filtered.length === 0 ? (
                        <div className="no-results"><p>No levels found</p></div>
                    ) : (
                        filtered.map((level) => (
                            <button
                                key={level.level_id}
                                onClick={() => handleLevelClick(level)}
                                className={`level-item${selectedLevel?.level_id === level.level_id ? ' active' : ''}`}
                            >
                                <div className="level-position">#{level.position}</div>
                                <div className="level-name">{level.name}</div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="level-details"
            style={{
                backgroundImage: selectedLevel ? `url(${THUMBNAIL_BASE}/${selectedLevel.level_id}.webp)` : undefined,
            }}>
                {selectedLevel ? (
                    <div className="details-content">
                        <h2>{selectedLevel.name}</h2>
                        <div className="detail-info">
                            <p><strong>Position:</strong> #{selectedLevel.position}</p>
                            <p><strong>ID:</strong> {selectedLevel.level_id}</p>
                            <a href={selectedLevel.link} target="_blank" rel="noopener noreferrer" className="level-link">
                                View on AREDL
                            </a>
                            <a href={"https://localhost:5173/submit/" + selectedLevel.level_id} target="_blank" className="level-link">
                                Add to Personal List
                            </a>
                        </div>

                        {selectedLevel.description ? (
                            <div className="detail-info">
                                <p>{selectedLevel.description}</p>
                            </div>
                        ) : (
                            <div className="level-placeholder">
                                <p>This level has no description</p>
                            </div>
                        )}

                        
                    </div>
                ) : (
                    <div className="details-placeholder">
                        <p>Select a level to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
}