import { useState } from "react";

type ToastData = {
    id: number;
    message: string;
    type: "success" | "error" | "warning";
};

export function useToast() {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const showToast = (
        message: string,
        type: ToastData["type"] = "success"
    ) => {
        const id = Date.now();

        setToasts(prev => [
            ...prev,
            { id, message, type }
        ]);

        setTimeout(() => {
            setToasts(prev =>
                prev.filter(t => t.id !== id)
            );
        }, 3000);
    };

    return {
        toasts,
        showToast
    };
}