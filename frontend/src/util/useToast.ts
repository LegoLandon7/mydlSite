import { create } from "zustand";

type ToastData = {
    id: number;
    message: string;
    type: "success" | "error" | "warning";
};

type ToastState = {
    toasts: ToastData[];
    showToast: (message: string, type?: ToastData["type"]) => void;
    removeToast: (id: number) => void;
};

export const useToast = create<ToastState>((set) => ({
    toasts: [],

    showToast: (message, type = "success") => {
        const id = Date.now();

        set((state) => ({
            toasts: [...state.toasts, { id, message, type }],
        }));

        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, 3000);
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
}));