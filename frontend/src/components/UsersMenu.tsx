import './UsersMenu.scss';
import type { UserType } from '../util/types';
import { NavLink, useParams } from 'react-router';
import PlaceHolderIcon from '../assets/images/placeholder.png';
import SearchIcon from '../assets/icons/search.svg';
import { useEffect, useRef, useState } from 'react';
import { fetchUsers, searchUsers } from '../cache/userCache';

export default function UsersMenu() {
    const { id } = useParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchText, setSearchText] = useState("");
    const [pageData, setPageData] = useState<UserType[] | null>(null);
    const [searchResults, setSearchResults] = useState<UserType[] | null>(null);

    const displayedUsers = searchResults ?? pageData;
    const selectedUser = id ? pageData?.find(u => u.discord_id === id) : undefined;

    const scrollRef = useRef<HTMLDivElement>(null);

    // fetch page
    useEffect(() => {
        fetchUsers(currentPage).then((res) => setPageData(res.users));
    }, [currentPage]);

    // search with debounce
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

    return (
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

                            <button><img src={PlaceHolderIcon}/> Edit Description</button> {/* check if user is authed */}
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
    );
}