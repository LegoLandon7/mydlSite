import './UsersMenu.scss';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useEffect, useState } from 'react';

import SplitLayout from '../ui/SplitLayout';
import MenuSearch from '../ui/MenuSearch';
import Pagination from '../ui/Pagination';
import PageTabs from '../ui/PageTabs';
import IconButton from '../ui/IconButton';
import ShareButton from '../ui/ShareButton';
import Modal from '../ui/Modal';
import SiteHeader from '../web/SiteHeader';
import LevelCard from './LevelCard';
import AddLevelModal from './AddLevelModal';
import EditLevelModal from './EditLevelModal';

import { useUsers } from '../../api/call/users/usersStore';
import { useAuth } from '../../api/call/auth/auth';
import { useLevels } from '../../api/call/levels/levelsStore';
import { useToast } from '../../util/useToast';

import type { User, UserDetails, UserLevelEntry } from '../../api/types/users';

const PAGE_LIMIT = 20;
const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'levels', label: 'Levels' },
    { key: 'lists', label: 'Lists' },
];

export default function UsersMenu() {
    const loadPage = useUsers((s) => s.loadPage);
    const getPage = useUsers((s) => s.getPage);
    const loadUserDetails = useUsers((s) => s.loadUserDetails);
    const getUserDetails = useUsers((s) => s.getUserDetails);
    const updateDescription = useUsers((s) => s.updateDescription);
    const addUserLevel = useUsers((s) => s.addUserLevel);
    const updateUserLevel = useUsers((s) => s.updateUserLevel);
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

    const [showDescModal, setShowDescModal] = useState(false);
    const [descInput, setDescInput] = useState('');

    const [showAddLevel, setShowAddLevel] = useState(false);
    const [levelSearch, setLevelSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<import('../../api/types/levels').Level | null>(null);
    const [videoUrl, setVideoUrl] = useState('');
    const [record, setRecord] = useState(100);

    const [editEntry, setEditEntry] = useState<UserLevelEntry | null>(null);
    const [editVideo, setEditVideo] = useState('');
    const [editRecord, setEditRecord] = useState(100);

    const { id, tab } = useParams<{ id?: string; tab?: string }>();
    const activeTab = tab ?? 'details';
    const navigate = useNavigate();
    const offset = page * PAGE_LIMIT;

    const { user } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        const cached = getPage(offset);
        if (cached) { setUsers(cached.users); setTotal(cached.total); return; }
        loadPage(offset).then((d) => { setUsers(d.users); setTotal(d.total); }).catch(() => {});
    }, [offset]);

    useEffect(() => {
        if (!id) { setDetails(null); return; }
        const cached = getUserDetails(id);
        if (cached) { setDetails(cached); return; }
        loadUserDetails(id).then(setDetails).catch(() => setDetails(null));
    }, [id]);

    useEffect(() => {
        if (showAddLevel) loadLevels();
    }, [showAddLevel]);

    const handleRefreshMenu = () =>
        loadPage(offset, true).then((d) => { setUsers(d.users); setTotal(d.total); }).catch(() => {});

    const handleRefreshUser = () => {
        if (!id) return;
        loadUserDetails(id, true).then(setDetails).catch(() => setDetails(null));
    };

    const handleDescSubmit = async () => {
        if (!id) return;
        try {
            await updateDescription(id, descInput || null);
            setDetails(getUserDetails(id));
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
            setDetails(getUserDetails(id));
            setShowAddLevel(false);
            setSelectedLevel(null); setVideoUrl(''); setRecord(100); setLevelSearch('');
            showToast('Level added', 'success');
        } catch {
            showToast('Failed to add level', 'error');
        }
    };

    const handleEditSave = async () => {
        if (!id || !editEntry) return;
        try {
            await updateUserLevel(id, editEntry.level.level_id, editVideo || undefined, editRecord);
            setDetails(getUserDetails(id));
            setEditEntry(null);
            showToast('Level updated', 'success');
        } catch {
            showToast('Failed to update level', 'error');
        }
    };

    const handleRemoveLevel = async (level_id: number) => {
        if (!id) return;
        try {
            await removeUserLevel(id, level_id);
            setDetails(getUserDetails(id));
            showToast('Level removed', 'success');
        } catch {
            showToast('Failed to remove level', 'error');
        }
    };

    const openEdit = (entry: UserLevelEntry) => {
        setEditEntry(entry);
        setEditVideo(entry.video_url ?? '');
        setEditRecord(entry.record);
    };

    const totalPages = Math.ceil(total / PAGE_LIMIT);
    const query = searchText.toLowerCase();
    const filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(query) || u.discord_id.includes(query)
    );

    const canEdit = !!(user && details && (user.discord_id === details.user.discord_id || details.admin));
    const userLevelIds = new Set((details?.levels ?? []).map((e) => e.level.level_id));

    const handleTabChange = (key: string) => {
        if (id) navigate(`/users/${id}/${key}`, { replace: true });
    };

    const menu = (
        <>
            <MenuSearch
                value={searchText}
                onChange={setSearchText}
                placeholder="Search by username or ID..."
            />

            <div className="menu-list">
                {loadingPage && users.length === 0 ? (
                    <p className="menu-loading">Loading...</p>
                ) : (
                    filteredUsers.map((u) => (
                        <NavLink
                            key={u.discord_id}
                            to={`/users/${u.discord_id}/details`}
                            className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
                        >
                            {u.avatar_url && <img src={u.avatar_url} alt={u.username} className="menu-avatar" />}
                            <span>{u.username}</span>
                        </NavLink>
                    ))
                )}
            </div>

            <div className="menu-footer">
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPrev={() => setPage((p) => Math.max(0, p - 1))}
                    onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                />
                <IconButton onClick={handleRefreshMenu} title="Refresh">↺</IconButton>
            </div>
        </>
    );

    const renderPage = () => {
        if (loadingUser && !details) return (
            <div className="page-empty">
                <h1>⏳ Loading</h1>
                <p>Fetching user, please wait...</p>
            </div>
        );

        if (!id) return (
            <div className="page-empty">
                <h1>👤 No user selected</h1>
                <p>Select a user from the menu</p>
            </div>
        );

        if (!details) return (
            <div className="page-empty">
                <h1>⚠️ User not found</h1>
                <p>Check if the ID is correct</p>
            </div>
        );

        return (
            <>
                <PageTabs
                    tabs={TABS}
                    active={activeTab}
                    onSelect={handleTabChange}
                    right={
                        <>
                            <ShareButton />
                            <IconButton onClick={handleRefreshUser} title="Refresh">↺</IconButton>
                        </>
                    }
                />

                {activeTab === 'details' && (
                    <div className="tab-content">
                        <h1 className="user-heading">{details.user.username}</h1>

                        {details.user.avatar_url && (
                            <img className="user-avatar-lg" src={details.user.avatar_url} alt={details.user.username} />
                        )}

                        <div className="info-card">
                            <div className="info-row"><span>Username</span><strong>{details.user.username}</strong></div>
                            <div className="info-row"><span>Discord ID</span><strong>{details.user.discord_id}</strong></div>
                            {details.admin && (
                                <div className="info-row">
                                    <span>Role</span>
                                    <strong>{details.owner ? '👑 Owner' : '🛡️ Admin'}</strong>
                                </div>
                            )}
                        </div>

                        <div className="info-card desc-card">
                            <div className="desc-body">
                                {details.user.description
                                    ? <p>{details.user.description}</p>
                                    : <p className="muted">no description yet</p>
                                }
                            </div>
                            {canEdit && (
                                <button className="edit-desc-btn" onClick={() => {
                                    setDescInput(details.user.description ?? '');
                                    setShowDescModal(true);
                                }}>
                                    ✎ Edit
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'levels' && (
                    <div className="tab-content">
                        <div className="tab-header">
                            <h2>Levels</h2>
                            {canEdit && (
                                <button className="add-btn" onClick={() => setShowAddLevel(true)}>+ Add Level</button>
                            )}
                        </div>
                        {details.levels && details.levels.length > 0 ? (
                            <div className="level-list">
                                {details.levels.map((entry) => (
                                    <LevelCard
                                        key={entry.level.level_id}
                                        placement={entry.level.position}
                                        title={entry.level.name}
                                        imageUrl={entry.level.thumbnail_url ?? undefined}
                                        videoUrl={entry.video_url}
                                        record={entry.record}
                                        infoUrl={`/levels/${entry.level.level_id}`}
                                        onEdit={canEdit ? () => openEdit(entry) : undefined}
                                        onRemove={canEdit ? () => handleRemoveLevel(entry.level.level_id) : undefined}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="page-empty"><p>No levels added yet</p></div>
                        )}
                    </div>
                )}

                {activeTab === 'lists' && (
                    <div className="tab-content">
                        <h2>Lists</h2>
                        {details.lists && details.lists.length > 0 ? (
                            <div className="info-card">
                                {details.lists.map((list) => (
                                    <div className="info-row" key={list.list_id}>
                                        <strong>{list.name}</strong>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="page-empty"><p>No lists found</p></div>
                        )}
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            {showDescModal && (
                <Modal onClose={() => setShowDescModal(false)}>
                    <SiteHeader head="Edit Description" subhead="shown on your public profile" />
                    <div className="edit-desc-modal">
                        <textarea
                            maxLength={500}
                            value={descInput}
                            onChange={(e) => setDescInput(e.target.value)}
                            placeholder="Write something about yourself..."
                        />
                    </div>
                    <div className="modal-buttons">
                        <button className="btn-primary" onClick={handleDescSubmit}>Save</button>
                        <button onClick={() => setShowDescModal(false)}>Cancel</button>
                    </div>
                </Modal>
            )}

            {showAddLevel && (
                <AddLevelModal
                    levels={levels}
                    userLevelIds={userLevelIds}
                    levelSearch={levelSearch}
                    onLevelSearch={setLevelSearch}
                    selectedLevel={selectedLevel}
                    onSelect={setSelectedLevel}
                    videoUrl={videoUrl}
                    onVideoUrl={setVideoUrl}
                    record={record}
                    onRecord={setRecord}
                    onAdd={handleAddLevel}
                    onClose={() => {
                        setShowAddLevel(false);
                        setSelectedLevel(null); setVideoUrl(''); setRecord(100); setLevelSearch('');
                    }}
                />
            )}

            {editEntry && (
                <EditLevelModal
                    entry={editEntry}
                    videoUrl={editVideo}
                    record={editRecord}
                    onVideoChange={setEditVideo}
                    onRecordChange={setEditRecord}
                    onSave={handleEditSave}
                    onClose={() => setEditEntry(null)}
                />
            )}

            <SplitLayout menu={menu} page={renderPage()} />
        </>
    );
}