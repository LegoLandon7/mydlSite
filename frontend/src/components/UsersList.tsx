// AI assisted

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import './UsersList.scss';
import LevelCard from './LevelCard';
import SiteHeader from './SiteHeader'; // used only for the per-user header inside details

const API_URL = "https://api.myodl.net";

type User = {
    discord_id: string;
    username: string;
    avatar_url: string | null;
};

type Level = {
    level_id: number;
    name: string;
    position: number;
    link: string;
    description?: string;
    video_link?: string | null;
};

export default function UsersList({
    users,
    selectedUser,
    onSelectUser,
    totalPages,
    onPageChange,
    loading,
    error,
    onRetry
}: any) {

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[] | null>(null);

    const [page, setPage] = useState(1);

    const [me, setMe] = useState<User | null>(null);
    const [userLevels, setUserLevels] = useState<Level[]>([]);
    const [allLevels, setAllLevels] = useState<Level[]>([]);

    const [showPopup, setShowPopup] = useState(false);
    const [levelSearch, setLevelSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [videoDraft, setVideoDraft] = useState('');

    const navigate = useNavigate();

    const isOwner = me?.discord_id === selectedUser?.discord_id;

    useEffect(() => {
        fetch(`${API_URL}/auth/me`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(setMe);
    }, []);

    useEffect(() => {
        if (!selectedUser) return;
        fetch(`${API_URL}/list/user/${selectedUser.discord_id}/levels`)
            .then(r => r.json())
            .then(setUserLevels);
    }, [selectedUser]);

    useEffect(() => {
        if (!showPopup) return;
        fetch(`${API_URL}/list/`)
            .then(r => r.json())
            .then(setAllLevels);
    }, [showPopup]);

    const closePopup = () => {
        setShowPopup(false);
        setSelectedLevel(null);
        setLevelSearch('');
        setVideoDraft('');
    };

    const addLevel = async () => {
        if (!selectedLevel) return;

        await fetch(`${API_URL}/list/user/me`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level_id: selectedLevel.level_id, video_link: videoDraft || null })
        });

        const res = await fetch(`${API_URL}/list/user/${selectedUser!.discord_id}/levels`);
        setUserLevels(await res.json());

        closePopup();
    };

    const removeLevel = async (level_id: number) => {
        await fetch(`${API_URL}/list/user/levels/${level_id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        setUserLevels(prev => prev.filter(l => l.level_id !== level_id));
    };

    const editVideo = async (level_id: number, current?: string | null) => {
        const link = prompt("Video link (empty = remove)", current || "");
        if (link === null) return;

        await fetch(`${API_URL}/list/user/video`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level_id, video_link: link === "" ? null : link })
        });

        setUserLevels(prev =>
            prev.map(l =>
                l.level_id === level_id
                    ? { ...l, video_link: link === "" ? null : link }
                    : l
            )
        );
    };

    useEffect(() => {
        const t = setTimeout(() => {
            if (searchQuery.length < 2) {
                setSearchResults(null);
                return;
            }
            fetch(`${API_URL}/users/search?q=${searchQuery}`)
                .then(r => r.ok ? r.json() : null)
                .then(setSearchResults)
                .catch(() => setSearchResults(null));
        }, 300);

        return () => clearTimeout(t);
    }, [searchQuery]);

    const displayedUsers = searchResults ?? users;

    const filteredAllLevels = allLevels.filter(l =>
        l.name.toLowerCase().includes(levelSearch.toLowerCase())
    );

    const addBtnLabel = selectedLevel
        ? `Add "${selectedLevel.name}"`
        : 'Select a level above';

    if (loading) {
        return (
            <div className="users-container">
                <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="users-container">
                <div className="error-state">
                    <p className="error-title">⚠️ Failed to Load Users</p>
                    <p className="error-message">{error}</p>
                    <button onClick={onRetry} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="users-container">

                <div className="users-list-container">

                    <div className="search-box">
                        <input
                            className="search-input"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="users-list">
                        {displayedUsers.map((user: User) => (
                            <button
                                key={user.discord_id}
                                className={`user-item${selectedUser?.discord_id === user.discord_id ? ' active' : ''}`}
                                onClick={() => {
                                    onSelectUser(user);
                                    navigate(`/users/${user.discord_id}`);
                                }}
                            >
                                <img
                                    className="user-avatar"
                                    src={user.avatar_url || '/placeholder.png'}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder.png';
                                    }}
                                />
                                <span className="user-name">{user.username}</span>
                            </button>
                        ))}
                    </div>

                    <div className="pagination">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={`page-btn${page === p ? ' active' : ''}`}
                                onClick={() => {
                                    setPage(p);
                                    onPageChange(p);
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>

                </div>

                <div className="user-details">

                    {selectedUser ? (
                        <div className="details-content">

                            <div className="header-bar">
                                <SiteHeader
                                    head={`${selectedUser.username}'s Personal List`}
                                    subhead=""
                                />
                                {isOwner && (
                                    <button className="add-btn" onClick={() => setShowPopup(true)}>
                                        + Add Level
                                    </button>
                                )}
                            </div>

                            <div className="levels">
                                {userLevels.map(level => (
                                    <div key={level.level_id} className="user-level-item">
                                        <LevelCard
                                            placement={level.position}
                                            title={level.name}
                                            imageUrl={`https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/${level.level_id}.webp`}
                                            videoUrl={level.video_link ?? undefined}
                                            infoUrl={`/list/${level.level_id}`}
                                        />
                                        {isOwner && (
                                            <div className="level-actions">
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => editVideo(level.level_id, level.video_link)}
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => removeLevel(level.level_id)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {showPopup && (
                                <div className="popup-overlay" onClick={closePopup}>
                                    <div className="popup" onClick={(e) => e.stopPropagation()}>

                                        <div className="popup-header">
                                            <span>Add Level</span>
                                            <button className="popup-close" onClick={closePopup}>✕</button>
                                        </div>

                                        <div className="popup-search">
                                            <input
                                                placeholder="Search levels..."
                                                value={levelSearch}
                                                onChange={(e) => setLevelSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>

                                        <div className="popup-list">
                                            {filteredAllLevels.length > 0 ? (
                                                filteredAllLevels.map(level => (
                                                    <button
                                                        key={level.level_id}
                                                        className={selectedLevel?.level_id === level.level_id ? 'selected' : ''}
                                                        onClick={() => setSelectedLevel(
                                                            selectedLevel?.level_id === level.level_id ? null : level
                                                        )}
                                                    >
                                                        <span className="popup-level-position">#{level.position}</span>
                                                        <span className="popup-level-name">{level.name}</span>
                                                        {selectedLevel?.level_id === level.level_id && (
                                                            <span className="popup-level-check">✓</span>
                                                        )}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="popup-no-results">
                                                    <p>No levels found</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="popup-footer">
                                            <input
                                                placeholder="Video link (optional)"
                                                value={videoDraft}
                                                onChange={(e) => setVideoDraft(e.target.value)}
                                            />
                                            <button
                                                className={`popup-add-btn${!selectedLevel ? ' disabled' : ''}`}
                                                onClick={addLevel}
                                                disabled={!selectedLevel}
                                            >
                                                {addBtnLabel}
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="details-placeholder">
                            <p>Select a user</p>
                        </div>
                    )}

                </div>

            </div>
    );
}