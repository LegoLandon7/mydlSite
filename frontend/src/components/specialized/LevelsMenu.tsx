import './LevelsMenu.scss';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';

import SplitLayout from '../ui/SplitLayout';
import MenuSearch from '../ui/MenuSearch';
import IconButton from '../ui/IconButton';
import ShareButton from '../ui/ShareButton';
import Modal from '../ui/Modal';
import SiteHeader from '../web/SiteHeader';

import { useLevels } from '../../api/call/levels/levelsStore';
import { useAuth } from '../../api/call/auth/auth';
import { useToast } from '../../util/useToast';

import type { Level } from '../../api/types/levels';

export default function LevelsMenu() {
    const levels = useLevels((s) => s.levels);
    const loadLevels = useLevels((s) => s.loadLevels);
    const loading = useLevels((s) => s.loading);

    useEffect(() => { loadLevels(); }, []);

    const [searchText, setSearchText] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [inputLevel, setInputLevel] = useState<Partial<Level>>({});

    const { id } = useParams();
    const navigate = useNavigate();
    const numericId = id ? Number(id) : null;
    const level = numericId ? levels.find((l) => l.level_id === numericId) : undefined;
    const query = searchText.toLowerCase();

    const { user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        if (!id && levels.length > 0) {
            const first = levels.find((l) => l.position === 1) ?? levels[0];
            navigate(`/levels/${first.level_id}`, { replace: true });
        }
    }, [id, levels]);

    const handleSubmit = () => {
        if (!inputLevel.level_id) { showToast('Level ID is required', 'error'); return; }
        if (!inputLevel.name?.trim()) { showToast('Level name is required', 'error'); return; }
        showToast('Level submitted for review', 'success');
        setInputLevel({});
        setShowModal(false);
    };

    const filtered = levels.filter((l) =>
        l.name.toLowerCase().includes(query) ||
        l.position.toString().includes(query) ||
        l.level_id.toString().includes(query)
    );

    const menu = (
        <>
            <button
                className="request-btn"
                onClick={() => user ? setShowModal(true) : showToast('You must be logged in', 'error')}
            >
                Request New Level +
            </button>
            <MenuSearch
                value={searchText}
                onChange={setSearchText}
                placeholder="Search by name or ID..."
            />
            <div className="menu-list">
                {filtered.map((l) => (
                    <NavLink
                        key={l.level_id}
                        to={`/levels/${l.level_id}`}
                        className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
                    >
                        <span className="pos">#{l.position}</span>
                        <span className="name">{l.name}</span>
                    </NavLink>
                ))}
            </div>
        </>
    );

    const renderPage = () => {
        if (loading && levels.length === 0) return (
            <div className="page-empty">
                <h1>⏳ Loading</h1>
                <p>Fetching levels, please wait...</p>
            </div>
        );

        if (!id || !level) return (
            <div className="page-empty">
                <h1>{!id ? '⚠️ No level selected' : '⚠️ Level not found'}</h1>
                <p>{!id ? 'Select a level from the menu' : 'Check if your link is correct'}</p>
            </div>
        );

        return (
            <div
                className="level-page-inner"
                style={level.thumbnail_url ? {
                    backgroundImage: `url(${level.thumbnail_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                } : undefined}
            >
                <div className="level-page-overlay">
                    <div className="level-page-header">
                        <h1>{level.name}</h1>
                        <ShareButton />
                    </div>

                    <div className="level-info-card">
                        <div className="info-row"><span>Position</span><strong>#{level.position}</strong></div>
                        <div className="info-row"><span>Level ID</span><strong>{level.level_id}</strong></div>
                        {level.aredl_url && (
                            <a className="aredl-link" href={level.aredl_url} target="_blank" rel="noopener noreferrer">
                                View on AREDL
                            </a>
                        )}
                    </div>

                    {level.description && (
                        <div className="level-info-card">
                            <p>{level.description}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {showModal && (
                <Modal onClose={() => { setShowModal(false); setInputLevel({}); }}>
                    <SiteHeader
                        head="Request New Level"
                        subhead="our admin team will review your submission"
                    />
                    <div className="request-fields">
                        <div className="fields-row">
                            <div className="field">
                                <label>level id <span className="req">*</span></label>
                                <input
                                    maxLength={11}
                                    value={inputLevel.level_id ?? ''}
                                    onChange={(e) => setInputLevel({ ...inputLevel, level_id: Number(e.target.value.replace(/\D/g, '')) })}
                                />
                            </div>
                            <div className="field">
                                <label>level name <span className="req">*</span></label>
                                <input
                                    maxLength={25}
                                    value={inputLevel.name ?? ''}
                                    onChange={(e) => setInputLevel({ ...inputLevel, name: e.target.value })}
                                />
                            </div>
                            <div className="field">
                                <label>estimated position</label>
                                <input
                                    maxLength={6}
                                    value={inputLevel.position ?? ''}
                                    onChange={(e) => setInputLevel({ ...inputLevel, position: Number(e.target.value.replace(/\D/g, '')) })}
                                />
                            </div>
                            <div className="field">
                                <label>thumbnail url</label>
                                <input
                                    value={inputLevel.thumbnail_url ?? ''}
                                    onChange={(e) => setInputLevel({ ...inputLevel, thumbnail_url: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="field full">
                            <label>description</label>
                            <textarea
                                maxLength={500}
                                value={inputLevel.description ?? ''}
                                onChange={(e) => setInputLevel({ ...inputLevel, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-buttons">
                        <button className="btn-primary" onClick={handleSubmit}>Submit Level</button>
                        <button onClick={() => { setShowModal(false); setInputLevel({}); }}>Cancel</button>
                    </div>
                </Modal>
            )}

            <SplitLayout menu={menu} page={renderPage()} />
        </>
    );
}