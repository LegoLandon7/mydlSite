import './UsersMenu.scss';

import { NavLink, useParams } from 'react-router';
import { useEffect, useState } from 'react';

import SearchIcon from '../../assets/icons/search.svg';

import { useUsers } from '../../api/call/users/usersStore';
import { useAuth } from '../../api/call/auth/auth';

import type { User, UserDetails } from '../../api/types/users';

const PAGE_LIMIT = 20;
type Tab = 'details' | 'levels' | 'lists';

export default function UsersMenu() {
    const loadPage = useUsers((s) => s.loadPage);
    const getPage = useUsers((s) => s.getPage);
    const loadUserDetails = useUsers((s) => s.loadUserDetails);
    const getUserDetails = useUsers((s) => s.getUserDetails);
    const loadingPage = useUsers((s) => s.loadingPage);
    const loadingUser = useUsers((s) => s.loadingUser);

    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [searchText, setSearchText] = useState('');
    const [tab, setTab] = useState<Tab>('details');

    const { id } = useParams();
    const offset = page * PAGE_LIMIT;

    useEffect(() => {
        const cached = getPage(offset);
        if (cached) {
            setUsers(cached.users);
            setTotal(cached.total);
            return;
        }
        loadPage(offset).then((data) => {
            setUsers(data.users);
            setTotal(data.total);
        }).catch(() => {});
    }, [offset, loadPage, getPage]);

    useEffect(() => {
        if (!id) { setDetails(null); return; }
        const cached = getUserDetails(id);
        if (cached) { setDetails(cached); return; }
        loadUserDetails(id).then(setDetails).catch(() => setDetails(null));
    }, [id, loadUserDetails, getUserDetails]);

    const handleRefreshMenu = () => {
        loadPage(offset, true).then((data) => {
            setUsers(data.users);
            setTotal(data.total);
        }).catch(() => {});
    };

    const handleRefreshUser = () => {
        if (!id) return;
        loadUserDetails(id, true).then(setDetails).catch(() => setDetails(null));
    };

    const totalPages = Math.ceil(total / PAGE_LIMIT);
    const query = searchText.toLowerCase();

    const filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(query) ||
        u.discord_id.includes(query)
    );

    const { user } = useAuth();
    const [showDescModal, setShowDescModal] = useState(false);
    const [descInput, setDescInput] = useState('');

    const canEdit = user && details && (user.discord_id === details.user.discord_id || user.admin);

    const handleDescSubmit = async () => {
        if (!id) return;
        try {
            const res = await fetch(`${API_URL}/users/${id}/description`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ description: descInput }),
            });
            if (!res.ok) throw new Error();
            await loadUserDetails(id, true).then(setDetails);
            setShowDescModal(false);
        } catch {
            // handle error
        }
    };

    return (
        <div className="viewport">
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
                    filteredUsers.map((user) => (
                        <NavLink
                            key={user.discord_id}
                            to={`/users/${user.discord_id}`}
                            className="menu-item"
                        >
                            {user.avatar_url && (
                                <img className="menu-avatar" src={user.avatar_url} alt={user.username} />
                            )}
                            <h2>{user.username}</h2>
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
                    <div className="error">
                        <h1>⏳ Loading</h1>
                        <h3>Fetching user, please wait...</h3>
                    </div>
                </div>
            ) : !id ? (
                <div className="page">
                    <div className="error">
                        <h1>👤 No user selected</h1>
                        <h3>Select a user from the menu</h3>
                    </div>
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

                            {details.user.description ? (
                                <div className="info">
                                    <div className="detail">
                                        <h2>{details.user.description}</h2>
                                    </div>
                                    {canEdit && (
                                        <button onClick={() => { setDescInput(details.user.description ?? ''); setShowDescModal(true); }}>
                                            Edit Description
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="info">
                                    <div className="detail">
                                        <h3>no description provided...</h3>
                                    </div>
                                    {canEdit && (
                                        <button onClick={() => { setDescInput(''); setShowDescModal(true); }}>
                                            Add Description
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'levels' && (
                        <>
                            <h1>Levels</h1>
                            {details.levels && details.levels.length > 0 ? (
                                <div className="info">
                                    {details.levels.map((level) => (
                                        <div className="detail" key={level.level_id}>
                                            <h1>#{level.position}</h1>
                                            <h2>{level.name}</h2>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="error"><h3>No levels found</h3></div>
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
                    <div className="error">
                        <h1>⚠️ User not found</h1>
                        <h3>Check if the ID is correct</h3>
                    </div>
                </div>
            )}

            {showDescModal && <>
            <div className="modal-background" onClick={() => setShowDescModal(false)}></div>
            <div className="modal-viewport">
                <div className="info">
                    <div className="section big">
                        <div className="entry">
                            <div className="entry-detail">
                                <h3>description</h3>
                                <p> - shown on your profile</p>
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
                    <button onClick={() => setShowDescModal(false)}>Exit</button>
                </div>
            </div>
        </>}
        </div>
    );
}