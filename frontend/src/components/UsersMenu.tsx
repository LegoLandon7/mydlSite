import './UsersMenu.scss';
import type { LevelType, UserListType, UserType } from '../util/types';
import { NavLink, useLocation, useParams } from 'react-router';
import PlaceHolderIcon from '../assets/images/placeholder.png';
import SearchIcon from '../assets/icons/search.svg';
import { useEffect, useRef, useState } from 'react';
import { fetchUsers, searchUsers, handleDescription } from '../cache/userCache';
import { useToast } from '../util/useToast';
import ToastContainer from './ToastContainer';
import LevelCard from './LevelCard';
import { fetchUserList } from '../api/users';

export default function UsersMenu() {
    // variables
    const { id } = useParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchText, setSearchText] = useState("");
    const [pageData, setPageData] = useState<UserType[] | null>(null);
    const [userListData, setUserListData] = useState<UserListType[] | null>(null);
    const [userLevelData, setUserLevelData] = useState<LevelType[] | null>(null);
    const [searchResults, setSearchResults] = useState<UserType[] | null>(null);
    const [description, setDescription] = useState("");
    const [showDescriptionPopup, setShowDescriptionPopup] = useState(false);
    const { toasts, showToast } = useToast();

    // endpoint
    const location = useLocation();

    const isList = location.pathname.endsWith("/list");
    const isGroups = location.pathname.endsWith("/groups");
    const isDetails = !isList && !isGroups;

    const displayedUsers = searchResults ?? pageData;
    const selectedUser = id ? pageData?.find(u => u.discord_id === id) : undefined;

    const scrollRef = useRef<HTMLDivElement>(null);

    // fetch page
    useEffect(() => {
        fetchUsers(currentPage).then((res) => setPageData(res.users));
    }, [currentPage]);

    useEffect(() => {
        if (searchText.length < 2) {
            setSearchResults(null);
            return;
        }
        const timeout = setTimeout(() => {
            searchUsers(searchText).then(setSearchResults);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchText]);

    // fetch list
    useEffect(() =>  {
        if (!id) return;
        fetchUserList(id).then((res) => setUserListData(res));
        if (!userListData) return;
        for (data : res) {
            fetchLevel()
        }
        fetchLevel(res.level_id).then((res) => setUserLevelData(res));
    }, [id]);

    useEffect(() => {
        if (searchText.length < 2) {
            setSearchResults(null);
            return;
        }
        const timeout = setTimeout(() => {
            searchUsers(searchText).then(setSearchResults);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchText]);

    return (<>
        <div className="viewport" ref={scrollRef}>
            <div className="menu">
                <div className="search">
                    <img src={SearchIcon} />
                    <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search by name or ID..."
                    />
                </div>

                {displayedUsers?.map((u) => (
                    <NavLink key={u.discord_id} to={`/users/${u.discord_id}`} className="menu-item"
                    onClick={() => scrollRef.current?.scrollTo({left: 0, behavior: 'smooth'})}>
                        <img src={u.avatar_url ?? PlaceHolderIcon} />
                        <h2>{u.username}</h2>
                    </NavLink>
                ))}

                <button>Page #s</button>
            </div>

            {!id ? (
                <div className="page">
                    <div className="error">
                        <h1>⚠️ No user selected</h1>
                        <h3>Please select a user using the menu</h3>
                    </div>
                </div>
            ) : selectedUser ? (
                <div className="page">
                    <div className="header">
                        <img src={selectedUser.avatar_url ?? PlaceHolderIcon} />
                        <h1>{selectedUser.username}</h1>
                    </div>

                    <hr />

                    <nav className="user-navbar">
                        <NavLink to={`/users/${id}`} end>Details</NavLink>
                        <NavLink to={`/users/${id}/list`}>List</NavLink>
                        <NavLink to={`/users/${id}/groups`}>Groups</NavLink>
                    </nav>

                    {isDetails && <> 
                        <div className="info">
                            <div className="detail">
                                <h1>Discord ID:</h1>
                                <h2>{selectedUser.discord_id}</h2>
                            </div>
                            <div className="detail">
                                <h1>Username:</h1>
                                <h2>{selectedUser.username}</h2>
                            </div>
                        </div>

                        {selectedUser.avatar_url && (
                            <div className="info">
                                <div className="detail">
                                    <h1>{"testtest"}</h1>
                                </div>

                                <button onClick={() => {setShowDescriptionPopup(true)}}><img src={PlaceHolderIcon}/> Edit Description</button> {/* check if user is authed */}
                            </div>
                        )}
                    </>}

                    {isList && (
                        <div className="user-list">
                            <LevelCard
                                placement={userLevelData[0].position}
                            />
                        </div>
                    )}

                    {isGroups && (
                        <div className="info">
                            <h1>Groups</h1>
                            <p>User's groups go here.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="page">
                    <div className="error">
                        <h1>⚠️ User not found</h1>
                        <h3>Check if your link / id is correct</h3>
                    </div>
                </div>
            )}
        </div>

        {/* popups */}
        {showDescriptionPopup && (<>
            <div className="overlay" style={{ display: 'flex' }}>
                <div className="header">
                    <h1>{`Edit description for ${selectedUser?.username}`}</h1>
                    <pre>{`${description.length} / 500`}</pre>
                </div>


                <textarea 
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value);
                        if (description.length > 500) setDescription(description.slice(0, 500));
                    }}
                    placeholder="Explain a bit about yourself..."
                    maxLength={500}
                />

                <div className="overlay-menu">
                    <button onClick={async () => {
                        if (await handleDescription(description)) {
                            setShowDescriptionPopup(false);
                            showToast("[SUCCESS] successfully edited description", "success");
                        } else {
                            showToast("[ERROR] couldn't edit description", "error");
                        }
                    }}>Confirm</button>
                    <button onClick={() => {
                        setShowDescriptionPopup(false);
                        }}>Close</button>
                </div>
            </div>
        </>)}

        {toasts && (
            <ToastContainer toasts={toasts}
            />
        )}
    </>);
}