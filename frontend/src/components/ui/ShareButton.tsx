import './ShareButton.scss';
import { useToast } from '../../util/useToast';

type ShareButtonProps = {
    label?: string;
};

export default function ShareButton({ label = 'Share' }: ShareButtonProps) {
    const { showToast } = useToast();

    const handle = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showToast('Link copied!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    };

    return (
        <button className="share-btn" onClick={handle}>
            🔗 {label}
        </button>
    );
}
