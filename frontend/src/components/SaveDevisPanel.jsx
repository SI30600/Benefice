import { useState } from "react";
import axios from "axios";
import { Save, Loader2, Check, X, Database } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SaveDevisPanel({ getDevisData }) {
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState(null);

    const save = async () => {
        const data = getDevisData();
        if (!data) {
            setFeedback({ type: "error", message: "Remplis au moins un montant" });
            return;
        }
        setSaving(true);
        setFeedback(null);
        try {
            const created = [];
            const baseDesc = data.clientName
                ? `Devis ${data.clientName}`
                : "Devis assemblage";

            // Articles bucket → Matériel
            const materielAmount = (data.partsSale || 0) + (data.licenseFee || 0) + (data.officeFee || 0);
            if (materielAmount > 0) {
                const r = await axios.post(`${API}/finance/entries`, {
                    date: data.date,
                    category: "materiel",
                    amount: Number(materielAmount.toFixed(2)),
                    client_name: data.clientName,
                    description: `${baseDesc} — pièces${data.licenseFee ? " + Windows" : ""}${data.officeFee ? " + Office" : ""}`,
                });
                created.push(r.data);
            }

            // Prestations bucket
            const prestaAmount = (data.serviceFee || 0) + (data.travelAmount || 0);
            if (prestaAmount > 0) {
                const r = await axios.post(`${API}/finance/entries`, {
                    date: data.date,
                    category: "prestation",
                    amount: Number(prestaAmount.toFixed(2)),
                    client_name: data.clientName,
                    description: `${baseDesc} — ${data.serviceLabel || "service"}${data.travelLabel ? ` + ${data.travelLabel}` : ""}`,
                });
                created.push(r.data);
            }

            if (created.length === 0) {
                setFeedback({ type: "error", message: "Aucun montant facturable à enregistrer" });
            } else {
                setFeedback({
                    type: "success",
                    message: `${created.length} écriture${created.length > 1 ? "s" : ""} ajoutée${created.length > 1 ? "s" : ""} dans Suivi Finance`,
                });
            }
        } catch (e) {
            const detail = e.response?.data?.detail || e.message || "Erreur inconnue";
            setFeedback({ type: "error", message: `Échec : ${detail}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            data-testid="save-devis-panel"
            className="bg-[#0d0d0d] border border-[#333333] p-5 mb-6"
        >
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Database className="h-5 w-5 text-yellow-500 shrink-0" />
                    <div className="min-w-0">
                        <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500">
                            Sauvegarde du devis
                        </div>
                        <div className="text-sm font-semibold text-white">
                            Ajouter au Suivi Finance
                        </div>
                    </div>
                </div>

                <button
                    data-testid="btn-save-devis"
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
            </div>

            <p className="mt-3 text-[11px] text-gray-500 font-mono leading-relaxed">
                Crée 2 écritures dans le Suivi Finance : Matériel (pièces + Windows + Office) et Prestation (service + déplacement).
            </p>

            {feedback && (
                <div
                    data-testid="save-devis-feedback"
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
                    <span className="truncate">{feedback.message}</span>
                </div>
            )}
        </div>
    );
}
