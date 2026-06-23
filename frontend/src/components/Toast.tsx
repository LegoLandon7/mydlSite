import { useToast } from '../util/useToast'
import './Toast.scss'

export default function Toast() {
    const toasts = useToast((s) => s.toasts);

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast ${t.type}`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}