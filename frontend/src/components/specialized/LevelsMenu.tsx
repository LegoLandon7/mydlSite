import './LevelsMenu.scss';

import { NavLink, useNavigate, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';

import SearchIcon from '../../assets/icons/search.svg';
import SiteHeader from '../web/SiteHeader';

import { useLevels } from '../../api/call/levels/levelsStore';
import { useToast } from '../../util/useToast';
import { useAuth } from '../../api/call/auth/auth';

import type { Level } from '../../api/types/levels';

export default function LevelsMenu() {
    // load levels
    const levels = useLevels((s) => s.levels);
    const loadLevels = useLevels((s) => s.loadLevels);
    const loading = useLevels((s) => s.loading);

    useEffect(() => {
        loadLevels();
    }, [loadLevels]);

    // get level
    const [searchText, setSearchText] = useState("");
    const { id } = useParams();
    const navigate = useNavigate();

    const numericId = id ? Number(id) : null;
    const level = numericId ? levels.find(l => l.level_id === numericId) : undefined;
    const query = searchText.toLowerCase();

    useEffect(() => {
        if (!id && levels.length > 0) {
            const first = levels.find(l => l.position === 1) ?? levels[0];
            navigate(`/levels/${first.level_id}`, { replace: true });
        }
    }, [id, levels, navigate]);

    const [inputLevel, setInputLevel] = useState<Partial<Level>>({
        level_id: undefined,
        name: "",
        position: undefined,
        thumbnail_url: "",
        description: "",
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const [showModal, setShowModal] = useState(false);

    const { user } = useAuth();
    const { showToast } = useToast();

    const handleSubmit = () => {
        if (!inputLevel.level_id) {
            showToast("Level ID is required and must be a number", "error");
            return;
        }
        if (!inputLevel.name?.trim()) {
            showToast("Level name is required", "error");
            return;
        }

        showToast("Level successfully submitted", "success");
        setInputLevel({});
        setShowModal(false);
    };

    return (
    <div className="viewport" ref={scrollRef}>
        {/* submit level */}
        {showModal && <>
        <div className="modal-background"></div>
        <div className="modal-viewport">
            <SiteHeader head="Add new level" subhead="this level will be publicly available for everyone and placed by our admin team" />

            <div className="info">
                <div className="section small">
                    <div className="entry">
                        <div className="entry-detail">
                            <h3>level id</h3>
                            <p>* - id of level in gd</p>
                        </div>
                        <input 
                            maxLength={11}
                            value={inputLevel.level_id ?? ""}
                            onChange={(e) => setInputLevel({ ...inputLevel, level_id: Number(e.target.value.replace(/\D/g, ""))})}>
                        </input>
                    </div>

                    <div className="entry">
                        <div className="entry-detail">
                            <h3>level name</h3>
                            <p>* - name of level in gd</p>
                        </div>
                        <input 
                            maxLength={25}
                            value={inputLevel.name ?? ""}
                            onChange={(e) => setInputLevel({ ...inputLevel, name: e.target.value })}>
                        </input>
                    </div>

                    <div className="entry">
                        <div className="entry-detail">
                            <h3>level position</h3>
                            <p>  - estimate on the placement #</p>
                        </div>
                        <input 
                            maxLength={6}
                            value={inputLevel.position ?? ""}
                            onChange={(e) => setInputLevel({ ...inputLevel, position: Number(e.target.value.replace(/\D/g, "")) })}>
                        </input>
                    </div>

                    <div className="entry">
                        <div className="entry-detail">
                            <h3>level thumbnail</h3>
                            <p>  - url to an image</p>
                        </div>
                        <input
                            value={inputLevel.thumbnail_url ?? ""}
                            onChange={(e) => setInputLevel({ ...inputLevel, thumbnail_url: e.target.value })}>
                         </input>
                    </div>
                </div>
                <div className="section big">
                    <div className="entry">
                        <div className="entry-detail">
                            <h3>level description</h3>
                            <p>  - information about level</p>
                        </div>
                        <textarea 
                            maxLength={500}
                            value={inputLevel.description ?? ""} 
                            onChange={(e) => setInputLevel({ ...inputLevel, description: e.target.value })}>
                        </textarea>
                    </div>
                </div>
            </div>

            <div className="buttons">
                <button onClick={() => handleSubmit()}>Submit Level</button>
                <button onClick={() => {setShowModal(false); setInputLevel({});}}>Exit</button>
            </div>
        </div>
        </>}

        <div className={`menu`}>
            <button onClick={() => {
                user ? setShowModal(true)
                : showToast("you must be logged in", "error");
            }}>Request New Level +</button>

            <div className="search">
                <img src={SearchIcon}></img>
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name or ID..."/>
            </div>

            {levels.filter((level) => {
                return (
                    level.name.toLowerCase().includes(query) ||
                    level.position.toString().includes(query) ||
                    level.level_id.toString().includes(query)
                );
            }).map((level) => {
                return (<NavLink key={level.level_id} to={`/levels/${level.level_id}`}
                className="menu-item" onClick={() => scrollRef.current?.scrollTo({left: 0, behavior: 'smooth'})}>
                    <h1>{`#${level.position}`}</h1>
                    <h2>{level.name}</h2>
                </NavLink>);
            })}
        </div>

        {loading && levels.length === 0 ? (
            <div className="page">
                <div className="error">
                    <h1>⏳ Loading</h1>
                    <h3>Fetching levels, please wait...</h3>
                </div>
            </div>
        ) : !id ? (
            <div className="page">
                <div className="error">
                    <h1>⚠️ No level selected</h1>
                    <h3>Please select a level using the menu</h3>
                </div>
            </div>
        ) : level ? (
            <div className="page" style={{ backgroundImage: `url(${level.thumbnail_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                <h1>{level.name}</h1>

                <div className="info">
                    <div className="detail">
                        <h1>Position:</h1>
                        <h2>#{level.position}</h2>
                    </div>

                    <div className="detail">
                        <h1>Level ID:</h1>
                        <h2>{level.level_id}</h2>
                    </div>

                    {level.aredl_url && ( <a href={level.aredl_url} target="_blank" rel="noopener noreferrer">View on AREDL</a> )}
                </div>

                {level.description && (
                    <div className="info">
                        <div className="detail">
                            <h1>{level.description}</h1>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="page">
                <div className="error">
                    <h1>⚠️ Level not found</h1>
                    <h3>Check if your link / id is correct</h3>
                </div>
            </div>
        )}
    </div>);
}