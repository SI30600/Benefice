import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { ShieldCheck, Loader2, AlertCircle, LogIn } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "portal_token";

export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        localStorage.removeItem(TOKEN_KEY);
        delete axios.defaults.headers.common["Authorization"];
    }
};

export const useAuth = () => {
    const [user, setUser] = useState(null);     // { email } or null
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const check = useCallback(async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }
        setAuthToken(token);
        try {
            const r = await axios.get(`${API}/auth/portal/me`);
            setUser(r.data);
        } catch (_e) {
            setAuthToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Catch ?portal_token=... from OAuth callback redirect
        const url = new URL(window.location.href);
        const tok = url.searchParams.get("portal_token");
        const errParam = url.searchParams.get("portal_error");
        if (tok) {
            setAuthToken(tok);
            url.searchParams.delete("portal_token");
            url.searchParams.delete("email");
            window.history.replaceState({}, "", url.toString());
        }
        if (errParam) {
            setError(errParam);
            url.searchParams.delete("portal_error");
            window.history.replaceState({}, "", url.toString());
        }
        check();
    }, [check]);

    const logout = useCallback(async () => {
        try { await axios.post(`${API}/auth/portal/logout`); } catch (_e) { /* noop */ }
        setAuthToken(null);
        setUser(null);
    }, []);

    const login = useCallback(async () => {
        try {
            const r = await axios.get(`${API}/auth/portal/login`);
            window.location.href = r.data.auth_url;
        } catch (e) {
            setError("Impossible de générer l'URL de connexion");
        }
    }, []);

    return { user, loading, error, login, logout, refresh: check };
};

export default function LoginPage({ onLogin, error }) {
    return (
        <main
            data-testid="login-page"
            className="relative z-10 min-h-screen flex items-center justify-center text-white px-6"
        >
            <div className="w-full max-w-md bg-[#111111] border border-[#262626] p-10 relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-yellow-500" />
                <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-yellow-500" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-yellow-500" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-yellow-500" />

                <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 bg-yellow-500 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-black" strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-mono">
                            Portail sécurisé
                        </span>
                        <span className="text-base font-semibold tracking-tight">
                            BÉNÉFICE.NET
                        </span>
                    </div>
                </div>

                <h1 className="text-3xl font-bold tracking-tight mb-3">
                    Connexion <span className="text-yellow-500">requise</span>
                </h1>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                    Authentifie-toi avec ton compte Microsoft 365 professionnel pour accéder à ton espace.
                </p>

                {error && (
                    <div className="mb-6 px-3 py-2.5 border border-red-500/40 bg-red-500/5 text-red-400 text-[11px] font-mono tracking-wider flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                            {error === "email_non_autorise"
                                ? "Cet email n'est pas autorisé à accéder à l'application."
                                : `Erreur : ${error}`}
                        </span>
                    </div>
                )}

                <button
                    data-testid="btn-portal-login"
                    onClick={onLogin}
                    className="w-full flex items-center justify-center gap-3 h-14 bg-yellow-500 text-black text-sm tracking-[0.2em] uppercase font-mono font-bold hover:bg-yellow-400 transition-colors"
                >
                    <LogIn className="h-4 w-4" />
                    Se connecter avec Microsoft 365
                </button>

                <p className="mt-6 text-[10px] text-gray-500 font-mono tracking-wider text-center">
                    Authentification déléguée — Microsoft Entra ID
                </p>
            </div>
        </main>
    );
}

export const AuthLoading = () => (
    <main className="relative z-10 min-h-screen flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-gray-400 font-mono text-xs tracking-wider">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
            Vérification de session…
        </div>
    </main>
);
