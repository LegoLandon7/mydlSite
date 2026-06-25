import './LevelsMenu.scss';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';

import SplitLayout from '../ui/SplitLayout';
import MenuSearch from '../ui/MenuSearch';
import ShareButton from '../ui/ShareButton';

import { useLevels } from '../../api/call/levels/levelsStore';

export default function LevelsMenu() {
    const levels = useLevels((s) => s.levels);
    const loadLevels = useLevels((s) => s.loadLevels);
    const loading = useLevels((s) => s.loading);

    useEffect(() => { loadLevels(); }, []);

    const [searchText, setSearchText] = useState('');
    const layoutRef = useRef<HTMLDivElement>(null);

    const { id } = useParams();
    const navigate = useNavigate();
    const numericId = id ? Number(id) : null;
    const level = numericId ? levels.find((l) => l.level_id === numericId) : undefined;
    const query = searchText.toLowerCase();

    // auto-select first level when none chosen
    useEffect(() => {
        if (!id && levels.length > 0) {
            const first = levels.find((l) => l.position === 1) ?? levels[0];
            navigate(`/levels/${first.level_id}`, { replace: true });
        }
    }, [id, levels]);

    // on mobile, scroll back to the page panel when a level is picked
    const scrollToPage = () => {
        const el = layoutRef.current;
        if (el && window.innerWidth <= 768) {
            el.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };

    const filtered = levels.filter((l) =>
        l.name.toLowerCase().includes(query) ||
        l.position.toString().includes(query) ||
        l.level_id.toString().includes(query)
    );

    const menu = (
        <>
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
                        onClick={scrollToPage}
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
            {/* <p className="scroll-hint"><span>← swipe for menu →</span></p> */}
            <SplitLayout ref={layoutRef} menu={menu} page={renderPage()} />
        </>
    );
}