import './UsersMenu.scss';

import { NavLink, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';

import SearchIcon from '../../assets/icons/search.svg';
import SiteHeader from '../web/SiteHeader';

import { useUsers } from '../../api/call/users/usersStore';
import { useAuth } from '../../api/call/auth/auth';
import { useLevels } from '../../api/call/levels/levelsStore';
import { useToast } from '../../util/useToast';

import type { User, UserDetails } from '../../api/types/users';
import type { Level } from '../../api/types/levels';

const PAGE_LIMIT = 20;
type Tab = 'details' | 'levels' | 'lists';

export default function UsersMenu() {
    const loadPage = useUsers((s) => s.loadPage);
    const getPage = useUsers((s) => s.getPage);
    const loadUserDetails = useUsers((s) => s.loadUserDetails);
    const getUserDetails = useUsers((s) => s.getUserDetails);
    const updateDescription = useUsers((s) => s.updateDescription);
    const addUserLevel = useUsers((s) => s.addUserLevel);
    const removeUserLevel = useUsers((s) => s.removeUserLevel);
    const loadingPage = useUsers((s) => s.loadingPage);
    const loadingUser = useUsers((s) => s.loadingUser);

    const levels = useLevels((s) => s.levels);
    const loadLevels = useLevels((s) => s.loadLevels);

    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [searchText, setSearchText] = useState('');
    const [tab, setTab] = useState<Tab>('details');

    const [showDescModal, setShowDescModal] = useState(false);
    const [descInput, setDescInput] = useState('');

    const [showAddLevelModal, setShowAddLevelModal] = useState(false);
    const [levelSearch, setLevelSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [record, setRecord] = useState(100);

    const { id } = useParams();
    const offset = page * PAGE_LIMIT;
    const scrollRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        const cached = getPage(offset);
        if (cached) { setUsers(cached.users); setTotal(cached.total); return; }
        loadPage(offset).then((data) => { setUsers(data.users); setTotal(data.total); }).catch(() => {});
    }, [offset, loadPage, getPage]);

    useEffect(() => {
        if (!id) { setDetails(null); return; }
        const cached = getUserDetails(id);
        if (cached) { setDetails(cached); return; }
        loadUserDetails(id).then(setDetails).catch(() => setDetails(null));
    }, [id, loadUserDetails, getUserDetails]);

    useEffect(() => {
        if (showAddLevelModal) loadLevels();
    }, [showAddLevelModal, loadLevels]);

    const handleRefreshMenu = () => {
        loadPage(offset, true).then((data) => { setUsers(data.users); setTotal(data.total); }).catch(() => {});
    };

    const handleRefreshUser = () => {
        if (!id) return;
        loadUserDetails(id, true).then(setDetails).catch(() => setDetails(null));
    };

    const handleDescSubmit = async () => {
        if (!id) return;
        try {
            await updateDescription(id, descInput || null);
            const fresh = getUserDetails(id);
            if (fresh) setDetails(fresh);
            setShowDescModal(false);
            showToast('Description updated', 'success');
        } catch {
            showToast('Failed to update description', 'error');
        }
    };

    const handleAddLevel = async () => {
        if (!id || !selectedLevel) { showToast('Select a level', 'error'); return; }
        try {
            await addUserLevel(id, selectedLevel.level_id, videoUrl || undefined, record);
            const fresh = getUserDetails(id);
            if (fresh) setDetails(fresh);
            setShowAddLevelModal(false);
            setSelectedLevel(null);
            setVideoUrl('');
            setRecord(100);
            setLevelSearch('');
            showToast('Level added', 'success');
        } catch {
            showToast('Failed to add level', 'error');
        }
    };

    const handleRemoveLevel = async (level_id: number) => {
        if (!id) return;
        try {
            await removeUserLevel(id, level_id);
            const fresh = getUserDetails(id);
            if (fresh) setDetails(fresh);
            showToast('Level removed', 'success');
        } catch {
            showToast('Failed to remove level', 'error');
        }
    };

    const totalPages = Math.ceil(total / PAGE_LIMIT);
    const query = searchText.toLowerCase();
    const filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(query) || u.discord_id.includes(query)
    );

    const canEdit = user && details && (user.discord_id === details.user.discord_id || details.admin);

    const userLevelIds = new Set((details?.levels ?? []).map((l) => l.level_id));
    const filteredLevels = levels.filter((l) => {
        const q = levelSearch.toLowerCase();
        return (
            l.name.toLowerCase().includes(q) ||
            l.position.toString().includes(q) ||
            l.level_id.toString().includes(q)
        );
    });

    return (
        <div className="viewport" ref={scrollRef}>
            {showDescModal && <>
                <div className="modal-background" onClick={() => setShowDescModal(false)} />
                <div className="modal-viewport">
                    <SiteHeader head="Edit Description" subhead="shown on your public profile" />
                    <div className="info">
                        <div className="section big">
                            <div className="entry">
                                <div className="entry-detail">
                                    <h3>description</h3>
                                    <p> — up to 500 characters</p>
                                </div>
                                <textarea
                                    maxLength={500}
                                    value={descInput}
                                    onChange={(e) => setDescInput(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="buttons">
                        <button onClick={handleDescSubmit}>Save</button>
                        <button onClick={() => setShowDescModal(false)}>Cancel</button>
                    </div>
                </div>
            </>}

            {showAddLevelModal && <>
                <div className="modal-background" onClick={() => setShowAddLevelModal(false)} />
                <div className="modal-viewport">
                    <SiteHeader head="Add Level" subhead="add a completed level to this profile" />
                    <div className="info">
                        <div className="section small">
                            <div className="entry">
                                <div className="entry-detail">
                                    <h3>search levels</h3>
                                </div>
                                <input
                                    placeholder="name, position, or id..."
                                    value={levelSearch}
                                    onChange={(e) => setLevelSearch(e.target.value)}
                                />
                            </div>
                            <div className="level-picker">
                                {filteredLevels.slice(0, 50).map((l) => (
                                    <button
                                        key={l.level_id}
                                        className={`level-pick-item${selectedLevel?.level_id === l.level_id ? ' selected' : ''}${userLevelIds.has(l.level_id) ? ' already-added' : ''}`}
                                        onClick={() => setSelectedLevel(l)}
                                        disabled={userLevelIds.has(l.level_id)}
                                    >
                                        <span className="pos">#{l.position}</span>
                                        <span className="name">{l.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="section big">
                            <div className="entry">
                                <div className="entry-detail">
                                    <h3>selected level</h3>
                                </div>
                                <input
                                    readOnly
                                    value={selectedLevel ? `#${selectedLevel.position} — ${selectedLevel.name}` : ''}
                                    placeholder="none selected"
                                />
                            </div>
                            <div className="entry">
                                <div className="entry-detail">
                                    <h3>video url</h3>
                                    <p> — optional completion proof</p>
                                </div>
                                <input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/..."
                                />
                            </div>
                            <div className="entry">
                                <div className="entry-detail">
                                    <h3>record</h3>
                                    <p> — percent (1–100)</p>
                                </div>
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={record}
                                    onChange={(e) => setRecord(Math.min(100, Math.max(1, Number(e.target.value))))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="buttons">
                        <button onClick={handleAddLevel}>Add Level</button>
                        <button onClick={() => { setShowAddLevelModal(false); setSelectedLevel(null); setVideoUrl(''); setRecord(100); setLevelSearch(''); }}>Cancel</button>
                    </div>
                </div>
            </>}

            <div className="menu">
                <div className="search">
                    <img src={SearchIcon} alt="search" />
                    <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search by username or ID..."
                    />
                </div>

                {loadingPage && users.length === 0 ? (
                    <div className="menu-loading">Loading...</div>
                ) : (
                    filteredUsers.map((u) => (
                        <NavLink
                            key={u.discord_id}
                            to={`/users/${u.discord_id}`}
                            className="menu-item"
                            onClick={() => scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })}
                        >
                            {u.avatar_url && <img className="menu-avatar" src={u.avatar_url} alt={u.username} />}
                            <h2>{u.username}</h2>
                        </NavLink>
                    ))
                )}

                <div className="menu-footer">
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>←</button>
                            <span>{page + 1} / {totalPages}</span>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>→</button>
                        </div>
                    )}
                    <button className="refresh-btn" onClick={handleRefreshMenu}>↺</button>
                </div>
            </div>

            {loadingUser && !details ? (
                <div className="page">
                    <div className="error"><h1>⏳ Loading</h1><h3>Fetching user, please wait...</h3></div>
                </div>
            ) : !id ? (
                <div className="page">
                    <div className="error"><h1>👤 No user selected</h1><h3>Select a user from the menu</h3></div>
                </div>
            ) : details ? (
                <div className="page">
                    <div className="page-navbar">
                        <div className="page-tabs">
                            <button className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>Details</button>
                            <button className={tab === 'levels' ? 'active' : ''} onClick={() => setTab('levels')}>Levels</button>
                            <button className={tab === 'lists' ? 'active' : ''} onClick={() => setTab('lists')}>Lists</button>
                        </div>
                        <button className="refresh-btn" onClick={handleRefreshUser}>↺</button>
                    </div>

                    {tab === 'details' && (
                        <>
                            <h1>{details.user.username}</h1>
                            <div className="info">
                                <div className="detail">
                                    <h1>Username:</h1>
                                    <h2>{details.user.username}</h2>
                                </div>
                                <div className="detail">
                                    <h1>Discord ID:</h1>
                                    <h2>{details.user.discord_id}</h2>
                                </div>
                                {details.admin && (
                                    <div className="detail">
                                        <h1>Role:</h1>
                                        <h2>{details.owner ? '👑 Owner' : '🛡️ Admin'}</h2>
                                    </div>
                                )}
                            </div>
                            <div className="info desc-info">
                                {details.user.description ? (
                                    <div className="detail">
                                        <h2>{details.user.description}</h2>
                                    </div>
                                ) : (
                                    <div className="detail muted">
                                        <h3>no description yet</h3>
                                    </div>
                                )}
                                {canEdit && (
                                    <button
                                        className="edit-desc-btn"
                                        onClick={() => { setDescInput(details.user.description ?? ''); setShowDescModal(true); }}
                                    >
                                        ✎ Edit Description
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'levels' && (
                        <>
                            <div className="tab-header">
                                <h1>Levels</h1>
                                {canEdit && (
                                    <button className="add-btn" onClick={() => setShowAddLevelModal(true)}>+ Add Level</button>
                                )}
                            </div>
                            {details.levels && details.levels.length > 0 ? (
                                <div className="info">
                                    {details.levels.map((level) => (
                                        <div className="detail level-row" key={level.level_id}>
                                            <h1>#{level.position}</h1>
                                            <h2>{level.name}</h2>
                                            {canEdit && (
                                                <button className="remove-btn" onClick={() => handleRemoveLevel(level.level_id)}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="error"><h3>No levels added yet</h3></div>
                            )}
                        </>
                    )}

                    {tab === 'lists' && (
                        <>
                            <h1>Lists</h1>
                            {details.lists && details.lists.length > 0 ? (
                                <div className="info">
                                    {details.lists.map((list) => (
                                        <div className="detail" key={list.list_id}>
                                            <h2>{list.name}</h2>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="error"><h3>No lists found</h3></div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="page">
                    <div className="error"><h1>⚠️ User not found</h1><h3>Check if the ID is correct</h3></div>
                </div>
            )}
        </div>
    );
}