import './ListMenu.scss';
import type { LevelType, UserType } from '../util/types';
import { NavLink, useParams } from 'react-router';
import PlaceHolderIcon from '../assets/images/placeholder.png';
import { useRef, useState } from 'react';
import SearchIcon from '../assets/icons/search.svg';

type MenuProps = {
    data: LevelType[];
};

export default function ListMenu({ data }: MenuProps) {
    // search bar
    const [searchText, setSearchText] = useState("");
    const { id } = useParams();

    const numericId = id ? Number(id) : null;
    const level = numericId ? data.find(l => l.level_id === numericId) : undefined;

    const query = searchText.toLowerCase();

    const scrollRef = useRef<HTMLDivElement>(null);

    return (
    <div className="viewport" ref={scrollRef}>
        {/* level menu */}
        <div className={`menu`}>
            <div className="search">
                <img src={SearchIcon}></img>
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name or ID..."/>
            </div>

            {data.filter((level) => {
                {/* filter levels */}

                return (
                    level.name.toLowerCase().includes(query) ||
                    level.position.toString().includes(query) ||
                    level.level_id.toString().includes(query)
                );
            }).map((level) => {
                return (<NavLink key={level.level_id} to={`/list/${level.level_id}`}
                className="menu-item" onClick={() => scrollRef.current?.scrollTo({left: 0, behavior: 'smooth'})}>
                    <h1>{`#${level.position}`}</h1>
                    <h2>{level.name}</h2>
                </NavLink>);
            })}
        </div>

        {/* level page */}
        {!id ? (
            <div className="page">
                <div className="error">
                    <h1>⚠️ No level selected</h1>
                    <h3>Please select a level using the menu</h3>
                </div>
            </div>
        ) : level ? (
            <div className="page" style={{ backgroundImage: `url(${level.thumbnail})` }}>
                <h1>{level.name}</h1>

                <div className="info">
                    <div className="detail">
                        <h1>AREDL Placement:</h1>
                        <h2>#{level.position}</h2>
                    </div>

                    <div className="detail">
                        <h1>Level ID:</h1>
                        <h2>{level.level_id}</h2>
                    </div>
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