import './Toast.scss';

type ToastProps = {
    message: string;
    type: "success" | "error" | "warning"
}

export default function Toast({message, type}: ToastProps) {
    return <div className={`toast ${type}`}>{message}</div>
}