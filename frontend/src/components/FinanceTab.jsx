import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
    Wallet, Plus, Trash2, Calendar, ArrowDownToLine, ArrowUpFromLine,
    AlertCircle, Loader2, Check, RefreshCw, Coins, FileText, Receipt,
    FileCheck2, ExternalLink,
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) =>
    new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n || 0);

const monthLabel = (yyyymm) => {
    if (!yyyymm) return "";
    const [y, m] = yyyymm.split("-");
    const dt = new Date(Number(y), Number(m) - 1, 1);
    return dt.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

const SectionCard = ({ children, className = "" }) => (
    <div className={`bg-[#111111] border border-[#262626] p-5 md:p-6 ${className}`}>
        {children}
    </div>
);

const SectionTitle = ({ icon: Icon, children, accent }) => (
    <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className={`h-3.5 w-3.5 ${accent || "text-yellow-500"}`} />}
        <span className={`text-[10px] tracking-[0.3em] uppercase font-mono ${accent || "text-yellow-500"}`}>
            {children}
        </span>
    </div>
);

const StatBox = ({ label, value, color = "text-white", testid, sub }) => (
    <div data-testid={testid} className="border border-[#333333] bg-[#0d0d0d] p-3">
        <div className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-500">
            {label}
        </div>
        <div className={`font-mono text-xl font-bold mt-1 ${color}`}>
            {typeof value === "number" ? `${fmt(value)} €` : value}
        </div>
        {sub && (
            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{sub}</div>
        )}
    </div>
);

export default function FinanceTab() {
    const today = new Date().toISOString().slice(0, 10);
    const [month, setMonth] = useState(today.slice(0, 7));
    const [summary, setSummary] = useState(null);
    const [entries, setEntries] = useState([]);
    const [pending, setPending] = useState({ items: [], total: 0 });
    const [balance, setBalance] = useState({ balance: 0, updated_at: "" });
    const [loading, setLoading] = useState(true);

    // Form states
    const [entryForm, setEntryForm] = useState({
        date: today,
        category: "prestation",
        amount: "",
        description: "",
        client_name: "",
    });
    const [pendingForm, setPendingForm] = useState({ client_name: "", amount: "", note: "" });
    const [balanceInput, setBalanceInput] = useState("");

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [sumR, entR, penR, balR] = await Promise.all([
                axios.get(`${API}/finance/summary?month=${month}`),
                axios.get(`${API}/finance/entries?month=${month}`),
                axios.get(`${API}/finance/pending`),
                axios.get(`${API}/finance/balance`),
            ]);
            setSummary(sumR.data);
            setEntries(entR.data);
            setPending(penR.data);
            setBalance(balR.data);
            setBalanceInput(String(balR.data.balance ?? 0));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => { refresh(); }, [refresh]);

    const addEntry = async () => {
        if (!entryForm.amount || parseFloat(entryForm.amount) <= 0) return;
        await axios.post(`${API}/finance/entries`, {
            ...entryForm,
            amount: parseFloat(entryForm.amount),
        });
        setEntryForm({ ...entryForm, amount: "", description: "", client_name: "" });
        refresh();
    };

    const deleteEntry = async (id) => {
        await axios.delete(`${API}/finance/entries/${id}`);
        refresh();
    };

    const addPending = async () => {
        if (!pendingForm.client_name || !pendingForm.amount) return;
        await axios.post(`${API}/finance/pending`, {
            ...pendingForm,
            amount: parseFloat(pendingForm.amount),
        });
        setPendingForm({ client_name: "", amount: "", note: "" });
        refresh();
    };

    const deletePending = async (id) => {
        await axios.delete(`${API}/finance/pending/${id}`);
        refresh();
    };

    const saveBalance = async () => {
        await axios.put(`${API}/finance/balance`, {
            balance: parseFloat(balanceInput) || 0,
        });
        refresh();
    };

    const cur = summary?.current;
    const prev = summary?.previous;

    const projected = useMemo(() => {
        if (!cur) return 0;
        const real = parseFloat(balanceInput) || 0;
        return real + pending.total - cur.total_taxes;
    }, [balanceInput, pending.total, cur]);

    const CategoryPill = ({ value }) => {
        const map = {
            prestation: { label: "Prestation", color: "border-blue-500/50 text-blue-400" },
            materiel: { label: "Matériel", color: "border-orange-500/50 text-orange-400" },
            formation: { label: "Formation", color: "border-purple-500/50 text-purple-400" },
        };
        const conf = map[value] || { label: value, color: "border-gray-500 text-gray-400" };
        return (
            <span className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${conf.color}`}>
                {conf.label}
            </span>
        );
    };

    return (
        <div data-testid="finance-tab" className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <span className="text-[10px] tracking-[0.3em] uppercase text-yellow-500 font-mono">
                        // Suivi finance
                    </span>
                    <h2 className="text-3xl font-bold tracking-tight mt-1">
                        {monthLabel(month) || "Mois en cours"}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        data-testid="finance-month-picker"
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm font-mono focus:outline-none [color-scheme:dark]"
                    />
                    <button
                        data-testid="finance-refresh"
                        onClick={refresh}
                        className="h-10 w-10 flex items-center justify-center border border-[#333333] hover:border-yellow-500 text-gray-400 hover:text-yellow-500 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {cur && (
                <>
                    {/* 2 grandes cartes : exactement les 2 cases de la déclaration URSSAF */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                            data-testid="bic-ventes-card"
                            className="bg-[#0d0d0d] border border-orange-500/40 p-6 relative"
                        >
                            <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-orange-400 mb-1">
                                Montant BIC ventes
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mb-3 leading-relaxed">
                                Ventes de marchandises (matériel)
                            </div>
                            <div className="font-mono text-4xl md:text-5xl font-bold text-orange-400 tracking-tight">
                                {fmt(cur.materiel)} <span className="text-2xl text-gray-500">€</span>
                            </div>
                        </div>

                        <div
                            data-testid="bic-prestations-card"
                            className="bg-[#0d0d0d] border border-blue-500/40 p-6 relative"
                        >
                            <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-blue-400 mb-1">
                                Montant BIC prestations
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono mb-3 leading-relaxed">
                                Prestations de services commerciales ou artisanales
                            </div>
                            <div className="font-mono text-4xl md:text-5xl font-bold text-blue-400 tracking-tight">
                                {fmt(cur.presta + cur.formation)} <span className="text-2xl text-gray-500">€</span>
                            </div>
                        </div>
                    </div>

                    <a
                        data-testid="btn-declarer-urssaf"
                        href="https://login-v2.urssaf.fr/api/oauth/v1/providerLogin?requestOrigin=response_type%3Dcode%26client_id%3DWEBAE-BDS%26state%3D2varjhLGUiDRE62JePHhR4ih4Rz087jsjxF1qMvJeUX%26redirect_uri%3Dhttps%3A%2F%2Fwww.autoentrepreneur.urssaf.fr%2Fservices%2Fcallback%3Faction%3Dlogin%26END%3DTRUE%26scope%3Dopenid%2Bbeae.api%2Bcfe.norme%2Bcfe.rpa%2Bteledep.declaration%2Bteledep.declarations%2Bteledep.mandat%2Bteledep.paiement%2Bannabel.password%2Boffline_access%26code_challenge%3DHfGzPitjtm8eWWFH1MZ4ftrMockDl3bCMI9cXmHhzL8%26code_challenge_method%3DS256%26nonce%3DYWb38zaDSsLKt084v9SMvh22GCDYQcqLlvrVhvQLkRr%26apm.clientId%3Dcd65d646-7564-4e25-8f6a-95281c723980%26ns%3DYw0yGYlZSXLEmXc2iq3p2ngtupOptQ7C1EmwUGETb8e6%2BNqTZ3B956PD033tthsfTNIuy8JtRERmE6On8iCqsbXKXjQiMl%2FUuGeH4UMoyzOQqMA8CuduaCwAKVd1XitT2xFctO4gnVfmDo%2Bny1DKakz1GCU%2BS8DaqCwIe3n5aB0%3D"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-center gap-3 w-full px-6 py-4 bg-yellow-500 text-black font-mono font-bold tracking-[0.25em] uppercase text-sm hover:bg-yellow-400 transition-colors"
                    >
                        <FileCheck2 className="h-5 w-5" />
                        <span>Déclarer sur urssaf.fr</span>
                        <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Récapitulatif compact */}
                        <SectionCard className="lg:col-span-2">
                            <SectionTitle icon={Receipt}>Récapitulatif</SectionTitle>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                <StatBox label="CA Total" value={cur.total_ca} color="text-yellow-500" testid="ca-total" />
                                <StatBox label="Total taxes" value={cur.total_taxes} color="text-red-400" testid="total-taxes" sub="à provisionner" />
                                <StatBox label="Net après taxes" value={cur.net_after_taxes} color="text-green-500" testid="net-after-taxes" />
                            </div>

                            {prev && (prev.total_ca > 0) && (
                                <div className="mt-4 pt-4 border-t border-[#333333]">
                                    <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500 mb-2">
                                        Comparaison · {monthLabel(summary.previous_month)}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                                            <div className="text-gray-500 uppercase tracking-wider text-[9px]">CA précédent</div>
                                            <div className="text-gray-200 mt-0.5">{fmt(prev.total_ca)} €</div>
                                        </div>
                                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                                            <div className="text-gray-500 uppercase tracking-wider text-[9px]">BIC ventes préc.</div>
                                            <div className="text-orange-300 mt-0.5">{fmt(prev.materiel)} €</div>
                                        </div>
                                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                                            <div className="text-gray-500 uppercase tracking-wider text-[9px]">BIC presta préc.</div>
                                            <div className="text-blue-300 mt-0.5">{fmt(prev.presta + prev.formation)} €</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SectionCard>

                        {/* Account state */}
                        <SectionCard>
                            <SectionTitle icon={Wallet}>État du compte</SectionTitle>

                            <label className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 block">
                                Solde réel sur le compte
                            </label>
                            <div className="flex gap-2 mt-1.5 mb-3">
                                <input
                                    data-testid="balance-input"
                                    type="number"
                                    step="0.01"
                                    value={balanceInput}
                                    onChange={(e) => setBalanceInput(e.target.value)}
                                    className="flex-1 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-500 text-lg font-mono font-bold focus:outline-none"
                                />
                                <button
                                    data-testid="balance-save"
                                    onClick={saveBalance}
                                    className="px-3 bg-yellow-500 text-black text-[10px] tracking-[0.15em] uppercase font-mono font-semibold hover:bg-yellow-400"
                                >
                                    OK
                                </button>
                            </div>
                            {balance.updated_at && (
                                <p className="text-[10px] text-gray-500 font-mono mb-3">
                                    Dernière maj : {new Date(balance.updated_at).toLocaleString("fr-FR")}
                                </p>
                            )}

                            <div className="space-y-2 text-[12px] font-mono pt-3 border-t border-[#333333]">
                                <div className="flex justify-between"><span className="text-gray-400">Solde réel</span><span className="text-white">{fmt(parseFloat(balanceInput) || 0)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">+ Paiements attendus</span><span className="text-green-400">+{fmt(pending.total)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">− Taxes du mois</span><span className="text-red-400">−{fmt(cur.total_taxes)} €</span></div>
                                <div className="flex justify-between pt-2 border-t border-[#333333]">
                                    <span className="text-yellow-300 uppercase tracking-wider text-[10px]">Disponible prév.</span>
                                    <span className={`text-lg font-bold ${projected >= 0 ? "text-green-500" : "text-red-500"}`}>
                                        {fmt(projected)} €
                                    </span>
                                </div>
                            </div>

                            {cur.last_entry_date && (
                                <p className="text-[10px] text-gray-500 font-mono mt-4 pt-3 border-t border-[#333333] flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3" />
                                    Dernière saisie : {new Date(cur.last_entry_date).toLocaleDateString("fr-FR")}
                                    {" · "}{cur.entries_count} entrée{cur.entries_count > 1 ? "s" : ""}
                                </p>
                            )}
                        </SectionCard>
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add entry */}
                <SectionCard>
                    <SectionTitle icon={Plus}>Saisir une entrée</SectionTitle>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                data-testid="entry-date"
                                type="date"
                                value={entryForm.date}
                                onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                                className="h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm font-mono focus:outline-none [color-scheme:dark]"
                            />
                            <select
                                data-testid="entry-category"
                                value={entryForm.category}
                                onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
                                className="h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                            >
                                <option value="prestation">Prestation</option>
                                <option value="materiel">Matériel</option>
                                <option value="formation">Formation</option>
                            </select>
                        </div>

                        <input
                            data-testid="entry-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={entryForm.amount}
                            onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                            placeholder="Montant TTC en €"
                            className="w-full h-12 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-500 text-2xl font-mono font-bold focus:outline-none"
                        />

                        <input
                            data-testid="entry-client"
                            type="text"
                            value={entryForm.client_name}
                            onChange={(e) => setEntryForm({ ...entryForm, client_name: e.target.value })}
                            placeholder="Nom du client (optionnel)"
                            className="w-full h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                        />
                        <input
                            data-testid="entry-description"
                            type="text"
                            value={entryForm.description}
                            onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                            placeholder="Description / note (optionnel)"
                            className="w-full h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                        />
                        <button
                            data-testid="entry-add"
                            onClick={addEntry}
                            className="w-full h-12 bg-yellow-500 text-black text-xs tracking-[0.2em] uppercase font-mono font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter au mois
                        </button>
                    </div>
                </SectionCard>

                {/* Pending payments */}
                <SectionCard>
                    <SectionTitle icon={Coins} accent="text-green-400">
                        Paiements en attente · {fmt(pending.total)} €
                    </SectionTitle>

                    <div className="grid grid-cols-12 gap-2 mb-3">
                        <input
                            data-testid="pending-client"
                            type="text"
                            value={pendingForm.client_name}
                            onChange={(e) => setPendingForm({ ...pendingForm, client_name: e.target.value })}
                            placeholder="Nom client"
                            className="col-span-5 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                        />
                        <input
                            data-testid="pending-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={pendingForm.amount}
                            onChange={(e) => setPendingForm({ ...pendingForm, amount: e.target.value })}
                            placeholder="Montant €"
                            className="col-span-4 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-green-400 text-sm font-mono font-bold focus:outline-none"
                        />
                        <button
                            data-testid="pending-add"
                            onClick={addPending}
                            className="col-span-3 h-11 bg-green-600 hover:bg-green-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter
                        </button>
                    </div>

                    {pending.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Aucun paiement en attente
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                            {pending.items.map((p) => (
                                <div
                                    key={p.id}
                                    data-testid={`pending-item-${p.id}`}
                                    className="flex items-center justify-between gap-2 px-3 py-2 bg-[#0d0d0d] border border-[#222222]"
                                >
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm text-white truncate">{p.client_name}</span>
                                        {p.note && (
                                            <span className="text-[10px] text-gray-500 truncate">{p.note}</span>
                                        )}
                                    </div>
                                    <span className="font-mono text-sm font-bold text-green-400 shrink-0">
                                        {fmt(p.amount)} €
                                    </span>
                                    <button
                                        data-testid={`pending-delete-${p.id}`}
                                        onClick={() => deletePending(p.id)}
                                        className="text-gray-500 hover:text-red-500 transition-colors"
                                        aria-label="Supprimer"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Entries list */}
            <SectionCard>
                <SectionTitle icon={FileText}>
                    Saisies du mois · {entries.length} ligne{entries.length > 1 ? "s" : ""}
                </SectionTitle>
                {entries.length === 0 ? (
                    <p className="text-[11px] text-gray-500 font-mono py-8 text-center border border-[#333333] border-dashed flex items-center justify-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Aucune entrée pour ce mois
                    </p>
                ) : (
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                        {entries.map((e) => (
                            <div
                                key={e.id}
                                data-testid={`entry-item-${e.id}`}
                                className="grid grid-cols-12 gap-2 items-center px-3 py-2 bg-[#0d0d0d] border border-[#222222] hover:border-[#444444]"
                            >
                                <span className="col-span-2 text-[11px] font-mono text-gray-400">{e.date}</span>
                                <span className="col-span-2"><CategoryPill value={e.category} /></span>
                                <div className="col-span-5 min-w-0">
                                    <div className="text-sm text-white truncate">
                                        {e.client_name || e.description || "—"}
                                    </div>
                                    {e.client_name && e.description && (
                                        <div className="text-[10px] text-gray-500 truncate">{e.description}</div>
                                    )}
                                    {e.source === "devis" && (
                                        <span className="text-[9px] text-yellow-500 font-mono uppercase tracking-wider">[auto]</span>
                                    )}
                                </div>
                                <span className="col-span-2 font-mono text-sm font-bold text-yellow-500 text-right">
                                    {fmt(e.amount)} €
                                </span>
                                <button
                                    data-testid={`entry-delete-${e.id}`}
                                    onClick={() => deleteEntry(e.id)}
                                    className="col-span-1 text-gray-500 hover:text-red-500 transition-colors flex justify-center"
                                    aria-label="Supprimer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
