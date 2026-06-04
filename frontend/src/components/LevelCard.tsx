import './LevelCard.scss';

import placeHolderImage from '../assets/images/placeholder.png';
import playImage from '../assets/images/play.svg';

type LevelCardProps = {
    placement?: number;
    aredlPlacement?: number;
    title?: string;
    imageUrl?: string;
    videoUrl?: string;
    infoUrl?: string;
};

export default function LevelCard({
    placement = 0,
    aredlPlacement = 0,
    title = "Unknown Level",
    imageUrl = placeHolderImage,
    videoUrl = undefined,
    infoUrl = undefined
}: LevelCardProps) {
    return (
        <a className="level-card" style={{ backgroundImage: `url(${imageUrl})` }} href={infoUrl}>
            <div className="left">
                <h1>{`#${placement}`}</h1>

                <div className="level-info">
                    <h1>{title}</h1>
                    <p>{`aredl #${aredlPlacement}`}</p>
                </div>
            </div>
            
            <div className="right">
                {videoUrl && <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <img src={playImage} alt="Play Video" />
                </a>}
            </div>
        </a>
    );
}