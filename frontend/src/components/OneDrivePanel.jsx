import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { Cloud, CloudOff, Save, Loader2, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OneDrivePanel({ getDevisPayload }) {
    const [status, setStatus] = useState({ loading: true, connected: false, user_email: "" });
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: "success"|"error", message }

    const fetchStatus = useCallback(async () => {
        try {
            const r = await axios.get(`${API}/auth/onedrive/status`);
            setStatus({ loading: false, ...r.data });
        } catch (e) {
            setStatus({ loading: false, connected: false });
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        // If user just came back from OneDrive callback, clear the param + refresh status
        const url = new URL(window.location.href);
        if (url.searchParams.get("onedrive") === "connected") {
            url.searchParams.delete("onedrive");
            window.history.replaceState({}, "", url.toString());
            setTimeout(fetchStatus, 600);
            setFeedback({ type: "success", message: "OneDrive connecté ✓" });
        }
    }, [fetchStatus]);

    const connect = async () => {
        try {
            const r = await axios.get(`${API}/auth/onedrive/login`);
            window.location.href = r.data.auth_url;
        } catch (e) {
            setFeedback({ type: "error", message: "Impossible d'obtenir l'URL de connexion" });
        }
    };

    const disconnect = async () => {
        await axios.post(`${API}/auth/onedrive/disconnect`);
        await fetchStatus();
        setFeedback({ type: "success", message: "Déconnecté" });
    };

    const save = async () => {
        const payload = getDevisPayload();
        if (!payload) {
            setFeedback({ type: "error", message: "Remplis au moins le nom du client et un montant" });
            return;
        }
        setSaving(true);
        setFeedback(null);
        try {
            const r = await axios.post(`${API}/onedrive/save-devis`, payload);
            setFeedback({
                type: "success",
                message: r.data.web_url
                    ? "Enregistré ✓ Cliquer pour ouvrir le fichier"
                    : "Enregistré dans OneDrive ✓",
                link: r.data.web_url,
            });
        } catch (e) {
            const detail =
                e.response?.data?.detail || e.message || "Erreur inconnue";
            setFeedback({ type: "error", message: `Échec : ${detail}` });
            // If unauthorized, refresh status
            if (e.response?.status === 401) await fetchStatus();
        } finally {
            setSaving(false);
        }
    };

    if (status.loading) {
        return (
            <div className="bg-[#0d0d0d] border border-[#333333] p-4 flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                <span className="text-xs font-mono text-gray-400 tracking-wider">
                    Vérification OneDrive…
                </span>
            </div>
        );
    }

    return (
        <div
            data-testid="onedrive-panel"
            className="bg-[#0d0d0d] border border-[#333333] p-5 mb-6"
        >
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {status.connected ? (
                        <Cloud className="h-5 w-5 text-green-500 shrink-0" />
                    ) : (
                        <CloudOff className="h-5 w-5 text-gray-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                        <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500">
                            OneDrive Excel
                        </div>
                        <div className="text-sm font-semibold text-white truncate">
                            {status.connected ? (
                                <span data-testid="onedrive-email">{status.user_email}</span>
                            ) : (
                                "Non connecté"
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {status.connected ? (
                        <>
                            <button
                                data-testid="btn-onedrive-save"
                                onClick={save}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black text-xs tracking-[0.15em] uppercase font-mono font-semibold hover:bg-yellow-400 transition-colors disabled:opacity-60"
                            >
                                {saving ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                {saving ? "En cours…" : "Enregistrer"}
                            </button>
                            <button
                                data-testid="btn-onedrive-disconnect"
                                onClick={disconnect}
                                className="px-3 py-2 border border-[#333333] text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                            >
                                Déconnecter
                            </button>
                        </>
                    ) : (
                        <button
                            data-testid="btn-onedrive-connect"
                            onClick={connect}
                            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black text-xs tracking-[0.15em] uppercase font-mono font-semibold hover:bg-yellow-400 transition-colors"
                        >
                            <Cloud className="h-3.5 w-3.5" />
                            Connecter OneDrive
                        </button>
                    )}
                </div>
            </div>

            <p className="mt-3 text-[11px] text-gray-500 font-mono leading-relaxed">
                {status.connected
                    ? `Le devis sera ajouté dans /BeneficeNet/devis-clients.xlsx — 1 ligne = 1 client.`
                    : `Connecte ton compte Microsoft pour enregistrer chaque devis dans un Excel sur ton OneDrive.`}
            </p>

            {feedback && (
                <div
                    data-testid="onedrive-feedback"
                    className={`mt-3 px-3 py-2 border text-[11px] font-mono tracking-wider flex items-center gap-2 ${
                        feedback.type === "success"
                            ? "border-green-500/40 bg-green-500/5 text-green-400"
                            : "border-red-500/40 bg-red-500/5 text-red-400"
                    }`}
                >
                    {feedback.type === "success" ? (
                        <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                        <X className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {feedback.link ? (
                        <a
                            href={feedback.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline truncate"
                        >
                            {feedback.message}
                        </a>
                    ) : (
                        <span className="truncate">{feedback.message}</span>
                    )}
                </div>
            )}
        </div>
    );
}
