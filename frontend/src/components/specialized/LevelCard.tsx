import './LevelCard.scss';
import placeholderImage from '../../assets/images/placeholder.png';

type LevelCardProps = {
    placement?: number;
    title?: string;
    imageUrl?: string;
    videoUrl?: string;
    record?: number;
    infoUrl?: string;
    onEdit?: () => void;
    onRemove?: () => void;
};

export default function LevelCard({
    placement = 0,
    title = 'Unknown Level',
    imageUrl = placeholderImage,
    videoUrl,
    record,
    infoUrl,
    onEdit,
    onRemove,
}: LevelCardProps) {
    return (
        <div className="level-card" style={{ backgroundImage: `url(${imageUrl})` }}>
            <a className="level-card-link" href={infoUrl}>
                <div className="lc-left">
                    <span className="lc-placement">#{placement}</span>
                    <div className="lc-info">
                        <span className="lc-title">{title}</span>
                        {record !== undefined && (
                            <span className="lc-record">{record}%</span>
                        )}
                    </div>
                </div>
            </a>

            <div className="lc-right">
                {videoUrl && (
                    <a className="lc-video-btn" href={videoUrl} target="_blank" rel="noopener noreferrer" title="Watch video">
                        ▶
                    </a>
                )}
                {onEdit && (
                    <button className="lc-edit-btn" onClick={onEdit} title="Edit">✎</button>
                )}
                {onRemove && (
                    <button className="lc-remove-btn" onClick={onRemove} title="Remove">✕</button>
                )}
            </div>
        </div>
    );
}