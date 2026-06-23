import { useEffect } from 'react'
import { useAuth } from './auth';
import { useToast } from '../../../util/useToast';

export default function AuthInit({ children }: { children: React.ReactNode }) {
    const loadUser = useAuth((s) => s.loadUser);
    const initialized = useAuth((s) => s.initialized);
    const user = useAuth((s) => s.user);
    const { showToast } = useToast();

    useEffect(() => {
        loadUser();
    }, []);

    useEffect(() => {
        if (initialized && user && sessionStorage.getItem("justLoggedIn")) {
            sessionStorage.removeItem("justLoggedIn");
            showToast("Logged in successfully", "success");
        }
    }, [initialized, user]);

    //if (!initialized) return <h1>loading...</h1>;

    return <>{children}</>;
}