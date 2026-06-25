import './EditLevelModal.scss';
import Modal from '../ui/Modal';
import SiteHeader from '../web/SiteHeader';
import type { UserLevelEntry } from '../../api/types/users';

type EditLevelModalProps = {
    entry: UserLevelEntry;
    videoUrl: string;
    record: number;
    onVideoChange: (v: string) => void;
    onRecordChange: (v: number) => void;
    onSave: () => void;
    onClose: () => void;
};

export default function EditLevelModal({
    entry,
    videoUrl,
    record,
    onVideoChange,
    onRecordChange,
    onSave,
    onClose,
}: EditLevelModalProps) {
    return (
        <Modal onClose={onClose}>
            <SiteHeader
                head={`Edit — ${entry.level.name}`}
                subhead={`#${entry.level.position}`}
            />
            <div className="edit-level-fields">
                <div className="field">
                    <label>video url <span className="hint">optional</span></label>
                    <input
                        value={videoUrl}
                        onChange={(e) => onVideoChange(e.target.value)}
                        placeholder="https://youtube.com/..."
                    />
                </div>
                <div className="field">
                    <label>record <span className="hint">1–100%</span></label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={record}
                        onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            if (digits === '') { onRecordChange(0); return; }
                            onRecordChange(Number(digits));
                        }}
                        onBlur={() => onRecordChange(Math.min(100, Math.max(1, record)))}
                    />
                </div>
            </div>
            <div className="modal-buttons">
                <button className="btn-primary" onClick={onSave}>Save</button>
                <button onClick={onClose}>Cancel</button>
            </div>
        </Modal>
    );
}