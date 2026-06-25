import './AddLevelModal.scss';
import Modal from '../ui/Modal';
import SiteHeader from '../web/SiteHeader';
import MenuSearch from '../ui/MenuSearch';
import type { Level } from '../../api/types/levels';

type AddLevelModalProps = {
    levels: Level[];
    userLevelIds: Set<number>;
    levelSearch: string;
    onLevelSearch: (v: string) => void;
    selectedLevel: Level | null;
    onSelect: (l: Level) => void;
    videoUrl: string;
    onVideoUrl: (v: string) => void;
    record: number;
    onRecord: (v: number) => void;
    onAdd: () => void;
    onClose: () => void;
};

export default function AddLevelModal({
    levels,
    userLevelIds,
    levelSearch,
    onLevelSearch,
    selectedLevel,
    onSelect,
    videoUrl,
    onVideoUrl,
    record,
    onRecord,
    onAdd,
    onClose,
}: AddLevelModalProps) {
    const filtered = levels.filter((l) => {
        const q = levelSearch.toLowerCase();
        return (
            l.name.toLowerCase().includes(q) ||
            l.position.toString().includes(q) ||
            l.level_id.toString().includes(q)
        );
    }).slice(0, 50);

    return (
        <Modal onClose={onClose}>
            <SiteHeader head="Add Level" subhead="add a completed level to this profile" />
            <div className="add-level-body">
                <div className="level-picker-col">
                    <MenuSearch
                        value={levelSearch}
                        onChange={onLevelSearch}
                        placeholder="search by name, position, or id..."
                    />
                    <div className="level-picker-list">
                        {filtered.map((l) => {
                            const alreadyAdded = userLevelIds.has(l.level_id);
                            return (
                                <button
                                    key={l.level_id}
                                    className={[
                                        'lp-item',
                                        selectedLevel?.level_id === l.level_id ? 'selected' : '',
                                        alreadyAdded ? 'added' : '',
                                    ].join(' ')}
                                    onClick={() => !alreadyAdded && onSelect(l)}
                                    disabled={alreadyAdded}
                                >
                                    <span className="lp-pos">#{l.position}</span>
                                    <span className="lp-name">{l.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="level-form-col">
                    <div className="field">
                        <label>selected level</label>
                        <input
                            readOnly
                            value={selectedLevel ? `#${selectedLevel.position} — ${selectedLevel.name}` : ''}
                            placeholder="none selected"
                        />
                    </div>
                    <div className="field">
                        <label>video url <span className="hint">optional</span></label>
                        <input
                            value={videoUrl}
                            onChange={(e) => onVideoUrl(e.target.value)}
                            placeholder="https://youtube.com/..."
                        />
                    </div>
                    <div className="field">
                        <label>record <span className="hint">1–100%</span></label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={record}
                            onChange={(e) => onRecord(Math.min(100, Math.max(1, Number(e.target.value))))}
                        />
                    </div>
                </div>
            </div>
            <div className="modal-buttons">
                <button className="btn-primary" onClick={onAdd}>Add Level</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </Modal>
    );
}
