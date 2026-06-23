import { useToast } from "../../../util/useToast";
import { useNavigate } from "react-router";
import { useAuth } from "./auth";

export function useAuthActions() {
    const { showToast } = useToast();
    const navigate = useNavigate();
    const logoutStore = useAuth((s) => s.logout);

    const logout = async () => {
        try {
            await logoutStore();
            showToast("Successfully logged out", "success");
            navigate("/");
        } catch {
            showToast("Logout failed", "error");
        }
    };

    const login = (redirectTo = "/") => {
        sessionStorage.setItem("justLoggedIn", "1");
        window.location.href = `${import.meta.env.VITE_API_URL}/auth/login?redirect=${encodeURIComponent(redirectTo)}`;
    };

    return { login, logout };
}