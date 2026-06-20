import Toast from "./Toast";
import "./Toast.scss";

type ToastData = {
    id: number;
    message: string;
    type: "success" | "error" | "warning";
};

type Props = {
    toasts: ToastData[];
};

export default function ToastContainer({ toasts }: Props) {
    return (
        <div className="toast-container">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                />
            ))}
        </div>
    );
}