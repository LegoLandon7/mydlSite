import { useState, useEffect } from 'react';
import ListMenu from '../components/ListMenu';
import type { LevelType } from '../util/types';
import '../util/containers.scss';

const API_URL = import.meta.env.VITE_API_URL;
const API_ENDPOINT = `${API_URL}/levels`

const CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export default function List() {
    const [levelData, setLevelData] = useState<LevelType[]>([]);

    useEffect(() => {
        async function loadLevelData() {
            // load cached levels
            const cached = localStorage.getItem("levelsCache");

            if (cached) {
                // check if cache timer is up
                const { data, timestamp } = JSON.parse(cached);
                
                if (Date.now() - timestamp < CACHE_TIME) {
                    // set current cached levels
                    setLevelData(data);
                    return;
                }
            }

            // cache missing / expired levels
            const response = await fetch(API_ENDPOINT);
            const freshData = await response.json();

            setLevelData(freshData);

            // cache new levels to local storage
            localStorage.setItem("levelsCache", JSON.stringify({
                data: freshData,
                timestamp: Date.now(),
            }));
        }

        // load level data
        loadLevelData();
    }, []);

    return (<>
    <ListMenu 
        data={levelData}
    />
    </>);
}