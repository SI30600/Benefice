import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
    Wallet, Plus, Trash2, Calendar, ArrowDownToLine, ArrowUpFromLine,
    AlertCircle, Loader2, Check, RefreshCw, Coins, FileText, Receipt,
    FileCheck2, ExternalLink, TrendingUp, RotateCcw, Package,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";

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

// Retourne YYYY-MM du mois M+2 (mois de prélèvement URSSAF pour un CA donné, décalage 2 mois)
const nextMonth = (yyyymm) => {
    if (!yyyymm) return "";
    const [y, m] = yyyymm.split("-");
    const dt = new Date(Number(y), Number(m) - 1 + 2, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
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
    const [lbcList, setLbcList] = useState({ items: [], total: 0 });
    const [charges, setCharges] = useState({ items: [], total: 0 });
    const [revenues, setRevenues] = useState({ items: [], total: 0 });
    const [toPrepare, setToPrepare] = useState({ items: [], total: 0 });
    const [stock, setStock] = useState({ items: [], total_value: 0, fixes: 0, portables: 0 });
    const [wife, setWife] = useState({ items: [], paid: 0, target: 300, remaining: 300 });
    // Override URSSAF désactivé : on utilise toujours l'auto-calcul depuis le CA réel
    // Variables maintenues pour compatibilité avec le reste du code (always 0)
    const urssafNextOverride = "";
    const setUrssafNextOverride = () => {};
    const saveUrssafOverride = () => {};
    // Nettoyage du localStorage si une ancienne valeur traîne
    useEffect(() => {
        try { localStorage.removeItem("urssaf_next_override"); } catch { /* noop */ }
    }, []);
    const [balance, setBalance] = useState({ balance: 0, cb_deferred: 0, lbc_pending: 0, updated_at: "" });
    const [loading, setLoading] = useState(true);

    // Form states
    const [entryForm, setEntryForm] = useState({
        date: today,
        category: "prestation",
        amount: "",
        description: "",
        client_name: "",
    });
    const [pendingForm, setPendingForm] = useState({ client_name: "", amount: "", note: "", category: "materiel" });
    const [lbcForm, setLbcForm] = useState({ label: "", amount: "", platform: "leboncoin", client_name: "" });
    const [chargeForm, setChargeForm] = useState({ label: "", amount: "", day_of_month: "" });
    const [revenueForm, setRevenueForm] = useState({ label: "", amount: "", day_of_month: "", prepaid: false });
    const [prepareForm, setPrepareForm] = useState({ label: "", amount: "", note: "" });
    const emptySpecs = {
        screen: "",
        resolution: "",
        cpu_brand: "",
        cpu_model: "",
        ram: "",
        storage: "",
        gpu: "",
        wifi: "",
        bluetooth: false,
        webcam: "",
        keyboard_backlit: false,
        warranty: "",
    };
    const [stockForm, setStockForm] = useState({
        label: "", kind: "fixe", quantity: "1", unit_value: "", serial: "",
        specs: { ...emptySpecs },
    });
    const [wifeForm, setWifeForm] = useState({ amount: "", note: "" });
    const [balanceInput, setBalanceInput] = useState("");
    const [cbDeferredInput, setCbDeferredInput] = useState("");
    const [lbcPendingInput, setLbcPendingInput] = useState("");

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [sumR, entR, penR, balR, lbcR, chargesR, revR, prepR, stockR, wifeR] = await Promise.all([
                axios.get(`${API}/finance/summary?month=${month}`),
                axios.get(`${API}/finance/entries?month=${month}`),
                axios.get(`${API}/finance/pending`),
                axios.get(`${API}/finance/balance`),
                axios.get(`${API}/finance/lbc-purchases`),
                axios.get(`${API}/finance/monthly-charges`),
                axios.get(`${API}/finance/recurring-revenues`),
                axios.get(`${API}/finance/payments-to-prepare`),
                axios.get(`${API}/finance/stock`),
                axios.get(`${API}/finance/wife-payments?month=${month}`),
            ]);
            setSummary(sumR.data);
            setEntries(entR.data);
            setPending(penR.data);
            setBalance(balR.data);
            setLbcList(lbcR.data);
            setCharges(chargesR.data);
            setRevenues(revR.data);
            setToPrepare(prepR.data);
            setStock(stockR.data);
            setWife(wifeR.data);
            setBalanceInput(String(balR.data.balance ?? 0));
            setCbDeferredInput(String(balR.data.cb_deferred ?? 0));
            setLbcPendingInput(String(balR.data.lbc_pending ?? 0));
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
            client_name: pendingForm.client_name,
            amount: parseFloat(pendingForm.amount),
            note: pendingForm.note || "",
            category: pendingForm.category || "materiel",
        });
        setPendingForm({ client_name: "", amount: "", note: "", category: "materiel" });
        refresh();
    };

    const deletePending = async (id) => {
        await axios.delete(`${API}/finance/pending/${id}`);
        refresh();
    };

    const confirmPending = async (id) => {
        await axios.post(`${API}/finance/pending/${id}/confirm`);
        refresh();
    };

    const updatePendingCategory = async (id, category) => {
        await axios.patch(`${API}/finance/pending/${id}`, { category });
        refresh();
    };

    const addLbcPurchase = async () => {
        if (!lbcForm.amount || parseFloat(lbcForm.amount) <= 0) return;
        const platform = lbcForm.platform || "leboncoin";
        await axios.post(`${API}/finance/lbc-purchases`, {
            label: lbcForm.label || `Achat ${platform}`,
            amount: parseFloat(lbcForm.amount),
            platform,
            client_name: lbcForm.client_name || "",
        });
        setLbcForm({ label: "", amount: "", platform: "leboncoin", client_name: "" });
        refresh();
    };

    const deleteLbcPurchase = async (id) => {
        await axios.delete(`${API}/finance/lbc-purchases/${id}`);
        refresh();
    };

    const resetMonth = async (yyyymm) => {
        if (!yyyymm) return;
        const label = monthLabel(yyyymm);
        const ok = window.confirm(
            `⚠ Reset du mois ${label}\n\nCela supprime TOUTES les écritures finance (CA + achats) de ce mois.\nLes paiements en attente, achats LBC en attente et abonnements ne sont PAS touchés.\n\nContinuer ?`
        );
        if (!ok) return;
        const res = await axios.delete(`${API}/finance/entries/month/${yyyymm}`);
        refresh();
        alert(`✓ ${res.data.deleted} écriture(s) supprimée(s) pour ${label}`);
    };

    // URSSAF auto-deduction: on/after the 4th of month M, withdraw URSSAF computed on M-2 CA
    const handleUrssaf = async (cycle, amount, action, sourceMonth) => {
        await axios.post(`${API}/finance/balance/urssaf-handle`, {
            cycle, amount: parseFloat(amount) || 0, action, source_month: sourceMonth || "",
        });
        // Clear any localStorage override so it doesn't re-apply next month
        try { localStorage.removeItem("urssaf_next_override"); } catch { /* noop */ }
        setUrssafNextOverride("");
        refresh();
    };

    const undoUrssaf = async (cycle) => {
        await axios.post(`${API}/finance/balance/urssaf-undo`, { cycle });
        refresh();
    };

    const addCharge = async () => {
        const amt = parseFloat(chargeForm.amount);
        const day = parseInt(chargeForm.day_of_month, 10);
        if (!chargeForm.label || !amt || !day || day < 1 || day > 31) return;
        await axios.post(`${API}/finance/monthly-charges`, {
            label: chargeForm.label,
            amount: amt,
            day_of_month: day,
        });
        setChargeForm({ label: "", amount: "", day_of_month: "" });
        refresh();
    };

    const deleteCharge = async (id) => {
        await axios.delete(`${API}/finance/monthly-charges/${id}`);
        refresh();
    };

    const addRevenue = async () => {
        const amt = parseFloat(revenueForm.amount);
        const day = parseInt(revenueForm.day_of_month, 10);
        if (!revenueForm.label || !amt || !day || day < 1 || day > 31) return;
        await axios.post(`${API}/finance/recurring-revenues`, {
            label: revenueForm.label,
            amount: amt,
            day_of_month: day,
            prepaid: !!revenueForm.prepaid,
        });
        setRevenueForm({ label: "", amount: "", day_of_month: "", prepaid: false });
        refresh();
    };

    const deleteRevenue = async (id) => {
        await axios.delete(`${API}/finance/recurring-revenues/${id}`);
        refresh();
    };

    const addPrepare = async () => {
        if (!prepareForm.label) return;
        await axios.post(`${API}/finance/payments-to-prepare`, {
            label: prepareForm.label,
            amount: parseFloat(prepareForm.amount) || 0,
            note: prepareForm.note || "",
        });
        setPrepareForm({ label: "", amount: "", note: "" });
        refresh();
    };

    const deletePrepare = async (id) => {
        await axios.delete(`${API}/finance/payments-to-prepare/${id}`);
        refresh();
    };

    const addStock = async () => {
        if (!stockForm.label) return;
        await axios.post(`${API}/finance/stock`, {
            label: stockForm.label,
            kind: stockForm.kind,
            quantity: parseInt(stockForm.quantity, 10) || 1,
            unit_value: parseFloat(stockForm.unit_value) || 0,
            serial: stockForm.serial || "",
            specs: stockForm.specs || {},
        });
        setStockForm({ label: "", kind: "fixe", quantity: "1", unit_value: "", serial: "", specs: { ...emptySpecs } });
        refresh();
    };

    const deleteStock = async (id) => {
        await axios.delete(`${API}/finance/stock/${id}`);
        refresh();
    };

    const addWifePayment = async () => {
        const amt = parseFloat(wifeForm.amount);
        if (!amt || amt <= 0) return;
        await axios.post(`${API}/finance/wife-payments`, {
            date: today,
            amount: amt,
            note: wifeForm.note || "",
        });
        setWifeForm({ amount: "", note: "" });
        refresh();
    };

    const deleteWifePayment = async (id) => {
        await axios.delete(`${API}/finance/wife-payments/${id}`);
        refresh();
    };

    const saveBalance = async () => {
        await axios.put(`${API}/finance/balance`, {
            balance: parseFloat(balanceInput) || 0,
            cb_deferred: parseFloat(cbDeferredInput) || 0,
            lbc_pending: parseFloat(lbcPendingInput) || 0,
        });
        refresh();
    };

    const cur = summary?.current;
    const prev = summary?.previous;

    // Charges/revenus récurrents dans les 35 prochains jours (horizon "disponible prév.")
    const PREV_HORIZON = 35;
    const todayDay = new Date().getDate();

    // Helpers : nombre d'occurrences d'un day_of_month dans les N prochains jours
    const countOccurrencesInHorizon = (dayOfMonth, horizon) => {
        if (!dayOfMonth) return 0;
        const now = new Date();
        let count = 0;
        for (let i = 1; i <= horizon; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            if (d.getDate() === dayOfMonth) count += 1;
        }
        return count;
    };

    // Prélèvements futurs (à venir ce mois + M+1 si horizon le couvre)
    const chargesUpcomingTotal = useMemo(
        () => (charges.items || []).reduce(
            (s, c) => s + (c.amount || 0) * countOccurrencesInHorizon(c.day_of_month, PREV_HORIZON),
            0
        ),
        [charges.items]
    );
    // Liste "à venir" pour l'affichage (marque passé/à venir dans le mois courant uniquement)
    const chargesUpcoming = useMemo(
        () => (charges.items || []).filter((c) => (c.day_of_month || 0) >= todayDay),
        [charges.items, todayDay]
    );
    // Revenus récurrents futurs (hors prépayés)
    const revenuesUpcomingTotal = useMemo(
        () => (revenues.items || [])
            .filter((r) => !r.prepaid)
            .reduce(
                (s, r) => s + (r.amount || 0) * countOccurrencesInHorizon(r.day_of_month, PREV_HORIZON),
                0
            ),
        [revenues.items]
    );
    const revenuesUpcoming = useMemo(
        () => (revenues.items || []).filter((r) => !r.prepaid && (r.day_of_month || 0) >= todayDay),
        [revenues.items, todayDay]
    );

    // URSSAF auto-deduction prompt: on/after the 4th of month M, withdraw URSSAF of CA from M-1
    const urssafPrompt = useMemo(() => {
        const today = new Date();
        const cycle = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        const handled = (balance.urssaf_handled_cycles || []).find((h) => h.cycle === cycle);
        const past4th = today.getDate() >= 4;
        // Amount from M-1 summary (only available when viewing current month's summary)
        const viewingCurrent = month === cycle;
        const autoAmount = viewingCurrent
            ? (summary?.previous?.total_taxes || 0)
            : 0;
        // Try to recover a raw override value set last month (bypass expiry check)
        let rawOverride = 0;
        try {
            const raw = localStorage.getItem("urssaf_next_override") || "";
            if (raw.includes("|")) {
                const [, v] = raw.split("|");
                rawOverride = parseFloat(v) || 0;
            }
        } catch { /* noop */ }
        const suggestedAmount = rawOverride > 0 ? rawOverride : autoAmount;
        const sourceMonth = summary?.previous_month || "";
        return {
            cycle, past4th, handled, suggestedAmount, sourceMonth,
            show: past4th && !handled && viewingCurrent && suggestedAmount > 0,
            showUndo: !!handled,
        };
    }, [balance.urssaf_handled_cycles, summary, month]);

    const [urssafPromptAmount, setUrssafPromptAmount] = useState("");
    useEffect(() => {
        if (urssafPrompt.show && !urssafPromptAmount) {
            setUrssafPromptAmount(String(urssafPrompt.suggestedAmount));
        }
    }, [urssafPrompt.show, urssafPrompt.suggestedAmount, urssafPromptAmount]);

    // URSSAF: prélèvement le 4 de chaque mois, sur CA de M-2 (décalage 2 mois)
    const upcomingUrssaf = useMemo(() => {
        const today = new Date();
        const handled = balance.urssaf_handled_cycles || [];
        const overrideVal = parseFloat(urssafNextOverride) || 0;
        const items = [];

        for (let offset = 0; offset <= 2; offset++) {
            const payDate = new Date(today.getFullYear(), today.getMonth() + offset, 4);
            const diff = Math.floor((payDate - today) / (1000 * 60 * 60 * 24));
            if (diff > PREV_HORIZON) continue;
            if (offset > 0 && diff < 0) continue;

            const cycle = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, "0")}`;
            if (handled.find((h) => h.cycle === cycle)) continue;

            // Source = M-2 relative to the payment month
            const srcDate = new Date(payDate.getFullYear(), payDate.getMonth() - 2, 1);
            const sourceMonth = `${srcDate.getFullYear()}-${String(srcDate.getMonth() + 1).padStart(2, "0")}`;

            let autoAmount = 0;
            if (sourceMonth === summary?.prev_prev_month) autoAmount = summary?.prev_prev?.total_taxes || 0;
            else if (sourceMonth === summary?.previous_month) autoAmount = summary?.previous?.total_taxes || 0;
            else if (sourceMonth === summary?.month) autoAmount = summary?.current?.total_taxes || 0;

            const isFirstShown = items.length === 0;
            const amount = (isFirstShown && autoAmount === 0 && overrideVal > 0) ? overrideVal : autoAmount;

            if (amount > 0) {
                items.push({ cycle, sourceMonth, amount, autoAmount, payDate: payDate.toISOString().slice(0, 10) });
            }
        }
        return items;
    }, [balance.urssaf_handled_cycles, summary, urssafNextOverride, PREV_HORIZON]);

    // Le "prochain" prélèvement = le premier de la liste (ou un fallback vide)
    const nextUrssaf = useMemo(() => {
        if (upcomingUrssaf.length > 0) {
            return { ...upcomingUrssaf[0] };
        }
        // No payment in horizon — fallback pour labels UI
        const today = new Date();
        const cycle = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        return { cycle, sourceMonth: summary?.previous_month || "", amount: 0 };
    }, [upcomingUrssaf, summary]);

    // URSSAF en cours : taxes accumulées sur le CA du mois courant (sera prélevée le 4 de M+1)
    const currentMonthUrssaf = useMemo(() => +(cur?.total_taxes || 0).toFixed(2), [cur]);

    // Évite le double comptage si le 4 de M+1 est déjà dans upcomingUrssaf (fenêtre 35j)
    const currentMonthInUpcoming = useMemo(() => {
        if (!summary?.month) return false;
        return upcomingUrssaf.some((u) => u.sourceMonth === summary.month);
    }, [upcomingUrssaf, summary]);

    const extraCurrentMonthUrssaf = currentMonthInUpcoming ? 0 : currentMonthUrssaf;

    const totalUpcomingUrssaf = useMemo(
        () => upcomingUrssaf.reduce((s, u) => s + u.amount, 0),
        [upcomingUrssaf]
    );

    const projected = useMemo(() => {
        if (!cur) return 0;
        const real = parseFloat(balanceInput) || 0;
        const cb = parseFloat(cbDeferredInput) || 0;
        return (
            real
            + pending.total
            + revenuesUpcomingTotal
            - totalUpcomingUrssaf
            - extraCurrentMonthUrssaf
            - cb
            - lbcList.total
            - chargesUpcomingTotal
        );
    }, [balanceInput, cbDeferredInput, lbcList.total, pending.total, cur, chargesUpcomingTotal, revenuesUpcomingTotal, totalUpcomingUrssaf, extraCurrentMonthUrssaf]);

    // Courbe prévisionnelle : 90 jours glissants (aujourd'hui → J+90)
    const projectionData = useMemo(() => {
        if (!cur) return [];
        const HORIZON_DAYS = 90;
        const PENDING_DELAY_DAYS = 12; // paiements attendus : tous crédités à J+12 (prudent)
        const now = new Date();
        const curDay = now.getDate();

        const real = parseFloat(balanceInput) || 0;
        const cb = parseFloat(cbDeferredInput) || 0;
        // Point de départ = cash réellement sur le compte (hors pending, qui arrivera à J+12)
        const startToday = real - cb - lbcList.total;

        // Pré-construit les événements pour les N prochains jours
        const eventsByDate = {};
        for (let i = 0; i <= HORIZON_DAYS; i++) {
            const d = new Date(now);
            d.setDate(curDay + i);
            const key = d.toISOString().slice(0, 10);
            eventsByDate[key] = 0;
        }

        // Paiements attendus : crédités en bloc à J+PENDING_DELAY_DAYS (prudent)
        if (pending.total > 0) {
            const d = new Date(now);
            d.setDate(curDay + PENDING_DELAY_DAYS);
            const key = d.toISOString().slice(0, 10);
            if (key in eventsByDate) eventsByDate[key] += pending.total;
        }

        (charges.items || []).forEach((c) => {
            for (let i = 0; i <= HORIZON_DAYS; i++) {
                const d = new Date(now);
                d.setDate(curDay + i);
                if (d.getDate() === c.day_of_month && i > 0) {
                    const key = d.toISOString().slice(0, 10);
                    if (key in eventsByDate) eventsByDate[key] -= (c.amount || 0);
                }
            }
        });
        (revenues.items || []).forEach((r) => {
            if (r.prepaid) return;
            for (let i = 0; i <= HORIZON_DAYS; i++) {
                const d = new Date(now);
                d.setDate(curDay + i);
                if (d.getDate() === r.day_of_month && i > 0) {
                    const key = d.toISOString().slice(0, 10);
                    if (key in eventsByDate) eventsByDate[key] += (r.amount || 0);
                }
            }
        });

        // URSSAF : prélèvement le 4 de chaque mois avec décalage de 2 mois (CA M → paiement 4 de M+2)
        const handled = balance.urssaf_handled_cycles || [];
        const overrideVal = parseFloat(urssafNextOverride) || 0;

        // 4 du mois courant = URSSAF de M-2 (prev_prev) — si pas encore traitée
        // Si la date est passée (cycle non traité), on place le prélèvement à aujourd'hui pour qu'il reste visible
        const curCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        if (!handled.find((h) => h.cycle === curCycle)) {
            const auto = summary?.prev_prev?.total_taxes || 0;
            const amt = auto > 0 ? auto : (overrideVal > 0 ? overrideVal : 0);
            if (amt > 0) {
                const m0 = new Date(now.getFullYear(), now.getMonth(), 4);
                const diff0 = Math.floor((m0 - now) / (1000 * 60 * 60 * 24));
                const targetDate = diff0 >= 0 ? m0 : now;
                const key = targetDate.toISOString().slice(0, 10);
                if (key in eventsByDate) eventsByDate[key] -= amt;
            }
        }
        // 4 de M+1 = URSSAF de M-1 (previous) — chiffre réel uniquement
        if ((summary?.previous?.total_taxes || 0) > 0) {
            const m1 = new Date(now.getFullYear(), now.getMonth() + 1, 4);
            const diff1 = Math.floor((m1 - now) / (1000 * 60 * 60 * 24));
            if (diff1 >= 0 && diff1 <= HORIZON_DAYS) {
                const key = m1.toISOString().slice(0, 10);
                if (key in eventsByDate) eventsByDate[key] -= summary.previous.total_taxes;
            }
        }
        // 4 de M+2 = URSSAF du mois courant (cur) — chiffre réel uniquement
        if ((cur?.total_taxes || 0) > 0) {
            const m2 = new Date(now.getFullYear(), now.getMonth() + 2, 4);
            const diff2 = Math.floor((m2 - now) / (1000 * 60 * 60 * 24));
            if (diff2 >= 0 && diff2 <= HORIZON_DAYS) {
                const key = m2.toISOString().slice(0, 10);
                if (key in eventsByDate) eventsByDate[key] -= cur.total_taxes;
            }
        }

        const keys = Object.keys(eventsByDate).sort();
        const points = [];
        let running = startToday;
        keys.forEach((key, idx) => {
            running += eventsByDate[key];
            const dd = new Date(key);
            points.push({
                day: key.slice(5), // "MM-DD" comme label
                dayNum: dd.getDate(),
                label: `${String(dd.getDate()).padStart(2, "0")}/${String(dd.getMonth() + 1).padStart(2, "0")}`,
                solde: Math.round(running * 100) / 100,
                idx,
            });
        });
        return points;
    }, [balanceInput, cbDeferredInput, pending.total, lbcList.total, charges.items, revenues.items, cur, summary, urssafNextOverride, balance.urssaf_handled_cycles]);

    const projectionMin = useMemo(
        () => (projectionData.length ? Math.min(...projectionData.map((p) => p.solde)) : 0),
        [projectionData]
    );

    const CategoryPill = ({ value }) => {
        const map = {
            prestation: { label: "Prestation", color: "border-blue-500/50 text-blue-400" },
            materiel: { label: "Matériel", color: "border-orange-500/50 text-orange-400" },
            formation: { label: "Formation", color: "border-purple-500/50 text-purple-400" },
            achat: { label: "Dépense", color: "border-red-500/50 text-red-400" },
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
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-yellow-500">
                                    {monthLabel(month)} (en cours)
                                </div>
                                <button
                                    data-testid="reset-current-month"
                                    type="button"
                                    onClick={() => resetMonth(month)}
                                    className="inline-flex items-center gap-1 px-2 h-6 border border-red-500/40 hover:bg-red-500/10 text-red-400 text-[9px] tracking-[0.15em] uppercase font-mono transition-colors"
                                    title={`Réinitialiser ${monthLabel(month)}`}
                                >
                                    <RotateCcw className="h-3 w-3" />
                                    Reset
                                </button>
                            </div>

                            {/* Bénéfice net en poche — chiffre HERO du mois */}
                            <div
                                data-testid="net-pocket-current"
                                className="bg-[#0d0d0d] border border-green-500/40 p-5 mb-3 relative overflow-hidden"
                            >
                                <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-green-400 mb-1">
                                    Dans ta poche ce mois-ci
                                </div>
                                <div className="text-[11px] text-gray-500 font-mono mb-2">
                                    CA − taxes − dépenses (achats & sous-traitance)
                                </div>
                                <div className="font-mono text-4xl md:text-5xl font-bold text-green-500 tracking-tight">
                                    {fmt(cur.net_in_pocket ?? cur.net_after_taxes)} <span className="text-2xl text-gray-500">€</span>
                                </div>
                                {(cur.achats || 0) > 0 && (
                                    <div className="text-[10px] text-gray-500 font-mono mt-2">
                                        dont − {fmt(cur.achats)} € de dépenses déduites
                                    </div>
                                )}
                                {prev && (
                                    (() => {
                                        const currentPocket = cur.net_in_pocket ?? cur.net_after_taxes ?? 0;
                                        const prevPocket = prev.net_in_pocket ?? prev.net_after_taxes ?? 0;
                                        const delta = currentPocket - prevPocket;
                                        const pct = prevPocket !== 0 ? (delta / Math.abs(prevPocket)) * 100 : 0;
                                        const positive = delta >= 0;
                                        return (
                                            <div
                                                data-testid="pocket-delta"
                                                className={`mt-3 inline-flex items-center gap-1.5 px-2 py-1 border ${positive ? "border-green-500/40 bg-green-900/20" : "border-red-500/40 bg-red-900/20"}`}
                                            >
                                                <span className={`text-[11px] font-mono font-bold ${positive ? "text-green-400" : "text-red-400"}`}>
                                                    {positive ? "▲" : "▼"} {positive ? "+" : ""}{fmt(delta)} €
                                                </span>
                                                <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-gray-500">
                                                    vs {monthLabel(summary.previous_month).split(" ")[0]}
                                                </span>
                                                {prevPocket !== 0 && (
                                                    <span className={`text-[10px] font-mono ${positive ? "text-green-400/80" : "text-red-400/80"}`}>
                                                        ({positive ? "+" : ""}{pct.toFixed(0)}%)
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                                <StatBox label="CA Total" value={cur.total_ca} color="text-yellow-500" testid="ca-total" />
                                <StatBox label="Total taxes" value={cur.total_taxes} color="text-red-400" testid="total-taxes" sub="à provisionner" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div className="border border-[#333333] bg-[#0d0d0d] p-2" data-testid="cur-bic-ventes">
                                    <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">BIC ventes</div>
                                    <div className="font-mono text-base font-semibold text-orange-400 mt-0.5">{fmt(cur.materiel)} €</div>
                                </div>
                                <div className="border border-[#333333] bg-[#0d0d0d] p-2" data-testid="cur-bic-presta">
                                    <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">BIC presta</div>
                                    <div className="font-mono text-base font-semibold text-blue-400 mt-0.5">{fmt(cur.presta + cur.formation)} €</div>
                                </div>
                            </div>

                            {/* Détail URSSAF — à checker avant déclaration */}
                            <div className="mt-3 border border-orange-500/40 bg-[#0d0d0d] p-3" data-testid="urssaf-breakdown">
                                <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-orange-400 mb-2">
                                    Détail URSSAF à déclarer
                                </div>
                                <div className="space-y-1 text-[11px] font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">URSSAF ventes <span className="text-gray-600">(12,3%)</span></span>
                                        <span className="text-orange-400">{fmt(cur.urssaf_materiel)} €</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">URSSAF presta <span className="text-gray-600">(21,2%)</span></span>
                                        <span className="text-orange-400">{fmt(cur.urssaf_presta + (cur.urssaf_formation || 0))} €</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Impôt ventes <span className="text-gray-600">(1%)</span></span>
                                        <span className="text-orange-400">{fmt(cur.impot_vente)} €</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Impôt presta <span className="text-gray-600">(1,7%)</span></span>
                                        <span className="text-orange-400">{fmt(cur.impot_presta + (cur.impot_formation || 0))} €</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">CFP <span className="text-gray-600">(0,2%)</span></span>
                                        <span className="text-orange-400">{fmt(cur.cfp)} €</span>
                                    </div>
                                    <div className="flex justify-between pt-1.5 mt-1.5 border-t border-[#333333]">
                                        <span className="text-white font-semibold uppercase tracking-wider text-[10px]">Total à payer</span>
                                        <span className="text-red-400 font-bold text-base">{fmt(cur.total_taxes)} €</span>
                                    </div>
                                </div>
                                <div className="text-[9px] text-gray-500 font-mono mt-2">
                                    Prélèvement prévu le 4 {monthLabel(nextMonth(month))}
                                </div>
                            </div>

                            {prev && (
                                <div className="mt-4 pt-4 border-t border-[#333333]">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-gray-400">
                                            {monthLabel(summary.previous_month)} (mois précédent)
                                        </div>
                                        <button
                                            data-testid="reset-previous-month"
                                            type="button"
                                            onClick={() => resetMonth(summary.previous_month)}
                                            className="inline-flex items-center gap-1 px-2 h-6 border border-red-500/40 hover:bg-red-500/10 text-red-400 text-[9px] tracking-[0.15em] uppercase font-mono transition-colors"
                                            title={`Réinitialiser ${monthLabel(summary.previous_month)}`}
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Reset
                                        </button>
                                    </div>

                                    <div
                                        data-testid="net-pocket-previous"
                                        className="bg-[#0d0d0d] border border-green-500/25 p-4 mb-3"
                                    >
                                        <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-green-400/80 mb-1">
                                            Dans ta poche
                                        </div>
                                        <div className="font-mono text-2xl md:text-3xl font-bold text-green-400/90 tracking-tight">
                                            {fmt(prev.net_in_pocket ?? prev.net_after_taxes)} <span className="text-lg text-gray-500">€</span>
                                        </div>
                                        {(prev.achats || 0) > 0 && (
                                            <div className="text-[10px] text-gray-500 font-mono mt-1">
                                                dont − {fmt(prev.achats)} € de dépenses déduites
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <StatBox label="CA Total" value={prev.total_ca} color="text-yellow-300/80" testid="prev-ca-total" />
                                        <StatBox label="Total taxes" value={prev.total_taxes} color="text-red-300/80" testid="prev-total-taxes" />
                                        <StatBox label="Net après taxes" value={prev.net_after_taxes} color="text-green-400/80" testid="prev-net-after-taxes" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                                            <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">BIC ventes préc.</div>
                                            <div className="font-mono text-base font-semibold text-orange-300/80 mt-0.5">{fmt(prev.materiel)} €</div>
                                        </div>
                                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                                            <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">BIC presta préc.</div>
                                            <div className="font-mono text-base font-semibold text-blue-300/80 mt-0.5">{fmt(prev.presta + prev.formation)} €</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </SectionCard>

                        {/* Account state */}
                        <SectionCard>
                            <SectionTitle icon={Wallet}>État du compte</SectionTitle>

                            {/* Banner URSSAF retirée — gestion via la liste "Sur 35 prochains jours" et bouton × */}

                            {/* Undo banner — show if URSSAF was recently auto-deducted */}
                            {urssafPrompt.showUndo && urssafPrompt.handled?.action === "consume" && (
                                <div
                                    data-testid="urssaf-undo-banner"
                                    className="mb-4 border border-green-500/40 bg-green-500/5 px-3 py-2 flex items-center justify-between"
                                >
                                    <span className="text-[11px] font-mono text-green-400">
                                        ✓ URSSAF −{fmt(urssafPrompt.handled.amount)} € déduite ({monthLabel(urssafPrompt.cycle).split(" ")[0]})
                                    </span>
                                    <button
                                        data-testid="urssaf-undo-btn"
                                        onClick={() => undoUrssaf(urssafPrompt.cycle)}
                                        className="text-[9px] tracking-[0.15em] uppercase font-mono text-gray-400 hover:text-yellow-500 transition-colors"
                                        title="Restaurer le montant au solde"
                                    >
                                        ↶ Annuler
                                    </button>
                                </div>
                            )}
                            {urssafPrompt.showUndo && urssafPrompt.handled?.action === "skip" && (
                                <div
                                    data-testid="urssaf-skip-banner"
                                    className="mb-4 border border-gray-500/40 bg-[#0a0a0a] px-3 py-2 flex items-center justify-between"
                                >
                                    <span className="text-[11px] font-mono text-gray-400">
                                        ✓ URSSAF {monthLabel(urssafPrompt.cycle).split(" ")[0]} marquée comme déjà traitée
                                    </span>
                                    <button
                                        data-testid="urssaf-undo-btn"
                                        onClick={() => undoUrssaf(urssafPrompt.cycle)}
                                        className="text-[9px] tracking-[0.15em] uppercase font-mono text-gray-400 hover:text-yellow-500 transition-colors"
                                    >
                                        ↶ Annuler
                                    </button>
                                </div>
                            )}

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
                                    onKeyDown={(e) => { if (e.key === "Enter") saveBalance(); }}
                                    className="flex-1 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-500 text-lg font-mono font-bold focus:outline-none"
                                />
                                <button
                                    data-testid="balance-save-top"
                                    onClick={saveBalance}
                                    className="px-3 bg-yellow-500 text-black text-[10px] tracking-[0.15em] uppercase font-mono font-semibold hover:bg-yellow-400"
                                >
                                    OK
                                </button>
                            </div>

                            <label className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 block">
                                Différé CB (à débiter)
                            </label>
                            <div className="flex gap-2 mt-1.5 mb-3">
                                <input
                                    data-testid="cb-deferred-input"
                                    type="number"
                                    step="0.01"
                                    value={cbDeferredInput}
                                    onChange={(e) => setCbDeferredInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveBalance(); }}
                                    className="flex-1 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-red-400 text-lg font-mono font-bold focus:outline-none"
                                />
                                <button
                                    data-testid="balance-save"
                                    onClick={saveBalance}
                                    className="px-3 bg-yellow-500 text-black text-[10px] tracking-[0.15em] uppercase font-mono font-semibold hover:bg-yellow-400"
                                >
                                    OK
                                </button>
                            </div>

                            <label className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 block">
                                Prochaine URSSAF
                                <span className="text-gray-600 normal-case ml-1">
                                    (CA {monthLabel(nextUrssaf.sourceMonth).split(" ")[0] || ""})
                                </span>
                            </label>
                            <div
                                data-testid="urssaf-next-display"
                                className="h-11 px-3 mt-1.5 mb-3 bg-[#0d0d0d] border border-[#333333] flex items-center text-orange-400 text-lg font-mono font-bold"
                            >
                                {fmt(nextUrssaf.autoAmount || nextUrssaf.amount || 0)} €
                            </div>

                            <label className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400 block">
                                Achats en attente · {fmt(lbcList.total)} €
                            </label>
                            <div className="grid grid-cols-12 gap-2 mt-1.5">
                                <select
                                    data-testid="lbc-purchase-platform"
                                    value={lbcForm.platform}
                                    onChange={(e) => setLbcForm({ ...lbcForm, platform: e.target.value })}
                                    className="col-span-5 h-10 px-2 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-xs font-mono focus:outline-none"
                                >
                                    <option value="leboncoin">Leboncoin</option>
                                    <option value="vinted">Vinted</option>
                                    <option value="ebay">eBay</option>
                                    <option value="rakuten">Rakuten</option>
                                    <option value="amazon">Amazon</option>
                                    <option value="facebook">Facebook MP</option>
                                    <option value="particulier">Particulier</option>
                                    <option value="magasin">Magasin</option>
                                    <option value="autre">Autre</option>
                                </select>
                                <input
                                    data-testid="lbc-purchase-client"
                                    type="text"
                                    value={lbcForm.client_name}
                                    onChange={(e) => setLbcForm({ ...lbcForm, client_name: e.target.value })}
                                    placeholder="Client (optionnel)"
                                    className="col-span-7 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-xs font-mono focus:outline-none placeholder:text-gray-600"
                                />
                            </div>
                            <div className="grid grid-cols-12 gap-2 mt-2 mb-2">
                                <input
                                    data-testid="lbc-purchase-amount"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={lbcForm.amount}
                                    onChange={(e) => setLbcForm({ ...lbcForm, amount: e.target.value })}
                                    onKeyDown={(e) => { if (e.key === "Enter") addLbcPurchase(); }}
                                    placeholder="Montant €"
                                    className="col-span-8 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-red-400 text-base font-mono font-bold focus:outline-none"
                                />
                                <button
                                    data-testid="lbc-purchase-add"
                                    onClick={addLbcPurchase}
                                    className="col-span-4 h-10 bg-red-600 hover:bg-red-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Ajouter
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 font-mono mb-2 leading-snug">
                                💡 Si le nom client correspond à un paiement en attente, l'achat sera automatiquement déduit de "dans ta poche" lors de l'encaissement.
                            </p>

                            {lbcList.items.length > 0 && (
                                <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
                                    {lbcList.items.map((p, idx) => {
                                        const plat = p.platform || "leboncoin";
                                        const isLinked = p.client_name && pending.items.some(
                                            (pp) => (pp.client_name || "").trim().toLowerCase() === (p.client_name || "").trim().toLowerCase()
                                        );
                                        return (
                                            <div
                                                key={p.id}
                                                data-testid={`lbc-item-${p.id}`}
                                                className={`flex items-center justify-between gap-2 px-2 py-1.5 bg-[#0d0d0d] border ${isLinked ? "border-yellow-500/40" : "border-[#222222]"}`}
                                            >
                                                <span className="text-[10px] text-gray-500 font-mono shrink-0 w-6">
                                                    #{lbcList.items.length - idx}
                                                </span>
                                                <span className="text-[9px] font-mono tracking-wider uppercase text-gray-400 shrink-0 px-1.5 py-0.5 border border-[#333333] bg-[#0a0a0a]">
                                                    {plat}
                                                </span>
                                                {p.client_name && (
                                                    <span
                                                        className={`text-[10px] font-mono truncate ${isLinked ? "text-yellow-400" : "text-gray-500"}`}
                                                        title={isLinked ? "Lié à un paiement en attente" : ""}
                                                    >
                                                        {isLinked ? "🔗 " : ""}{p.client_name}
                                                    </span>
                                                )}
                                                <span className="font-mono text-sm font-bold text-red-400 flex-1 text-right">
                                                    {fmt(p.amount)} €
                                                </span>
                                                <button
                                                    data-testid={`lbc-delete-${p.id}`}
                                                    onClick={() => deleteLbcPurchase(p.id)}
                                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                                    aria-label="Supprimer"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {balance.updated_at && (
                                <p className="text-[10px] text-gray-500 font-mono mb-3">
                                    Dernière maj : {new Date(balance.updated_at).toLocaleString("fr-FR")}
                                </p>
                            )}

                            <div className="space-y-2 text-[12px] font-mono pt-3 border-t border-[#333333]">
                                <div className="flex justify-between"><span className="text-gray-400">Solde réel</span><span className="text-white">{fmt(parseFloat(balanceInput) || 0)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">− Différé CB</span><span className="text-red-400">−{fmt(parseFloat(cbDeferredInput) || 0)} €</span></div>
                                <div className="flex justify-between border-y border-[#333333] py-1.5 bg-[#0a0a0a] px-2 -mx-2">
                                    <span className="text-blue-400 uppercase tracking-wider text-[10px]">État compte actuel</span>
                                    <span className={`font-bold ${((parseFloat(balanceInput) || 0) - (parseFloat(cbDeferredInput) || 0)) >= 0 ? "text-blue-400" : "text-red-500"}`}>
                                        {fmt((parseFloat(balanceInput) || 0) - (parseFloat(cbDeferredInput) || 0))} €
                                    </span>
                                </div>
                                <div className="text-[9px] tracking-[0.2em] uppercase font-mono text-gray-500 pt-1">Sur 35 prochains jours</div>
                                <div className="flex justify-between"><span className="text-gray-400">+ Paiements attendus</span><span className="text-green-400">+{fmt(pending.total)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">+ Abos clients à venir</span><span className="text-green-400">+{fmt(revenuesUpcomingTotal)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">− Achats en attente</span><span className="text-red-400">−{fmt(lbcList.total)} €</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">− Prélèvements à venir</span><span className="text-red-400">−{fmt(chargesUpcomingTotal)} €</span></div>
                                {upcomingUrssaf.length === 0 ? (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">− Prochaine URSSAF</span>
                                        <span className="text-red-400">−0,00 €</span>
                                    </div>
                                ) : (
                                    upcomingUrssaf.map((u, idx) => (
                                        <div key={u.cycle} className="flex justify-between items-center" data-testid={`urssaf-upcoming-${idx}`}>
                                            <span className="text-gray-400">
                                                − URSSAF {monthLabel(u.cycle).split(" ")[0].toUpperCase()}
                                                {u.sourceMonth && (
                                                    <span className="text-gray-600 text-[10px] ml-1">
                                                        (CA {monthLabel(u.sourceMonth).split(" ")[0]})
                                                    </span>
                                                )}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="text-red-400">−{fmt(u.amount)} €</span>
                                                <button
                                                    data-testid={`urssaf-skip-${idx}`}
                                                    onClick={() => handleUrssaf(u.cycle, u.amount, "skip", u.sourceMonth)}
                                                    className="text-gray-600 hover:text-yellow-500 text-[11px] leading-none px-1 transition-colors"
                                                    title="Déjà intégrée au solde réel — retirer de la prévision"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        </div>
                                    ))
                                )}
                                {extraCurrentMonthUrssaf > 0 && (
                                    <div className="flex justify-between" data-testid="urssaf-current-accruing">
                                        <span className="text-gray-400">
                                            − URSSAF en cours
                                            <span className="text-gray-600 text-[10px] ml-1">
                                                (CA {monthLabel(summary?.month || "").split(" ")[0]})
                                            </span>
                                        </span>
                                        <span className="text-red-400">−{fmt(extraCurrentMonthUrssaf)} €</span>
                                    </div>
                                )}
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
                        <select
                            data-testid="pending-category"
                            value={pendingForm.category}
                            onChange={(e) => setPendingForm({ ...pendingForm, category: e.target.value })}
                            className="col-span-3 h-11 px-2 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-[11px] font-mono focus:outline-none"
                        >
                            <option value="materiel">Matériel</option>
                            <option value="prestation">Prestation</option>
                        </select>
                        <button
                            data-testid="pending-add"
                            onClick={addPending}
                            className="col-span-12 h-10 bg-green-600 hover:bg-green-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Ajouter en attente
                        </button>
                    </div>

                    {pending.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Aucun paiement en attente
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                            {pending.items.map((p) => {
                                const cat = p.category || "materiel";
                                // Un achat lié ne s'applique qu'aux pendings "matériel" (pas aux prestations)
                                const linked = cat === "materiel"
                                    ? lbcList.items.filter(
                                        (lp) => (lp.client_name || "").trim().toLowerCase() === (p.client_name || "").trim().toLowerCase() && (p.client_name || "").trim()
                                    )
                                    : [];
                                const linkedAmount = linked.reduce((s, lp) => s + (lp.amount || 0), 0);
                                // Aperçu marge nette avant encaissement
                                // Taux total = URSSAF + impôt + CFP (13,5% matériel, 23,1% presta/formation)
                                const rate = cat === "materiel" ? 0.135 : 0.231;
                                const taxes = +((p.amount || 0) * rate).toFixed(2);
                                const netMargin = +((p.amount || 0) - taxes - linkedAmount).toFixed(2);
                                const marginPct = (p.amount || 0) > 0 ? +((netMargin / p.amount) * 100).toFixed(1) : 0;
                                const showMargin = linkedAmount > 0 && (p.amount || 0) > 0;
                                const goodMargin = netMargin > 0 && marginPct >= 20;
                                const okMargin = netMargin > 0 && marginPct < 20;
                                return (
                                    <div
                                        key={p.id}
                                        data-testid={`pending-item-${p.id}`}
                                        className="flex flex-col gap-1 px-3 py-2 bg-[#0d0d0d] border border-[#222222]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm text-white truncate">{p.client_name}</span>
                                                <span className="text-[9px] tracking-[0.15em] uppercase text-gray-500 font-mono flex items-center gap-2 flex-wrap">
                                                    <select
                                                        data-testid={`pending-cat-${p.id}`}
                                                        value={cat}
                                                        onChange={(e) => updatePendingCategory(p.id, e.target.value)}
                                                        className="h-5 px-1 bg-[#0a0a0a] border border-[#333333] hover:border-yellow-500 text-[9px] tracking-[0.15em] uppercase font-mono text-gray-300 focus:outline-none focus:border-yellow-500 cursor-pointer"
                                                    >
                                                        <option value="materiel">Matériel</option>
                                                        <option value="prestation">Prestation</option>
                                                    </select>
                                                    {linkedAmount > 0 && (
                                                        <span
                                                            data-testid={`pending-linked-${p.id}`}
                                                            className="inline-flex items-center gap-1 text-yellow-400 normal-case tracking-normal"
                                                            title={`${linked.length} achat(s) lié(s) — sera déduit à l'encaissement`}
                                                        >
                                                            <Package className="h-3 w-3" />
                                                            −{fmt(linkedAmount)} € achat lié
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                            <span className="font-mono text-sm font-bold text-green-400 shrink-0">
                                                {fmt(p.amount)} €
                                            </span>
                                            <button
                                                data-testid={`pending-confirm-${p.id}`}
                                                onClick={() => confirmPending(p.id)}
                                                className="flex items-center gap-1 px-2 h-7 bg-green-600 hover:bg-green-500 text-white text-[9px] tracking-[0.12em] uppercase font-mono font-semibold"
                                                aria-label="Encaisser"
                                                title="Virement reçu : convertir en CA"
                                            >
                                                <Check className="h-3 w-3" />
                                                Encaisser
                                            </button>
                                            <button
                                                data-testid={`pending-delete-${p.id}`}
                                                onClick={() => deletePending(p.id)}
                                                className="text-gray-500 hover:text-red-500 transition-colors"
                                                aria-label="Supprimer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        {showMargin && (
                                            <div
                                                data-testid={`pending-margin-${p.id}`}
                                                className={`flex items-center justify-between gap-2 mt-1 px-2 py-1 border text-[10px] font-mono ${
                                                    goodMargin
                                                        ? "border-green-500/40 bg-green-500/5 text-green-400"
                                                        : okMargin
                                                            ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-400"
                                                            : "border-red-500/40 bg-red-500/5 text-red-400"
                                                }`}
                                            >
                                                <span className="tracking-wider">
                                                    {goodMargin ? "✓" : okMargin ? "⚠" : "✗"}{" "}
                                                    {netMargin > 0 ? "marge nette" : "perte"} : {netMargin > 0 ? "+" : ""}{fmt(netMargin)} €
                                                    {" "}<span className="text-gray-500">({marginPct.toFixed(0)}%)</span>
                                                </span>
                                                <span className="text-gray-500 text-[9px]">
                                                    {fmt(p.amount)} − {fmt(taxes)} urssaf − {fmt(linkedAmount)} achat
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Courbe prévisionnelle du mois */}
            <SectionCard>
                <SectionTitle icon={TrendingUp} accent="text-cyan-400">
                    Prévisionnel glissant · 90 prochains jours
                </SectionTitle>
                <p className="text-[10px] text-gray-500 font-mono mb-4">
                    Projection du solde sur 90 jours — prélèvements, abos récurrents et URSSAF M+1 intégrés
                    {projectionMin < 0 && (
                        <span className="ml-2 text-red-400">⚠ point bas prévu : {fmt(projectionMin)} €</span>
                    )}
                </p>

                {projectionData.length === 0 ? (
                    <p className="text-[11px] text-gray-500 font-mono py-8 text-center border border-[#333333] border-dashed">
                        Pas de données à projeter
                    </p>
                ) : (
                    <div className="h-72 w-full" data-testid="projection-chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={projectionData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                <XAxis
                                    dataKey="label"
                                    stroke="#666"
                                    tick={{ fill: "#888", fontSize: 10, fontFamily: "monospace" }}
                                    interval="preserveStartEnd"
                                    minTickGap={25}
                                />
                                <YAxis
                                    stroke="#666"
                                    tick={{ fill: "#888", fontSize: 11, fontFamily: "monospace" }}
                                    tickFormatter={(v) => `${Math.round(v)} €`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "#0d0d0d",
                                        border: "1px solid #333",
                                        fontFamily: "monospace",
                                        fontSize: 12,
                                    }}
                                    labelStyle={{ color: "#eab308" }}
                                    labelFormatter={(lbl) => `Jour ${lbl}`}
                                    formatter={(value) => [`${fmt(value)} €`, "Solde projeté"]}
                                />
                                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "0 €", fill: "#ef4444", fontSize: 10, position: "insideRight" }} />
                                <Line
                                    type="monotone"
                                    dataKey="solde"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                    dot={{ fill: "#22d3ee", r: 3 }}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </SectionCard>

            {/* Charges mensuelles + Abonnements clients récurrents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prélèvements mensuels */}
                <SectionCard>
                    <SectionTitle icon={ArrowUpFromLine} accent="text-red-400">
                        Prélèvements mensuels · {fmt(charges.total)} €
                    </SectionTitle>
                    <p className="text-[10px] text-gray-500 font-mono mb-3">
                        Free, Matmut, assurances… — déduits du prévisionnel du mois
                    </p>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                        <input
                            data-testid="charge-label"
                            type="text"
                            value={chargeForm.label}
                            onChange={(e) => setChargeForm({ ...chargeForm, label: e.target.value })}
                            placeholder="Ex: Free box"
                            className="col-span-6 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-red-500 text-white text-sm focus:outline-none"
                        />
                        <input
                            data-testid="charge-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={chargeForm.amount}
                            onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                            placeholder="€"
                            className="col-span-3 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-red-500 text-red-300 text-sm font-mono focus:outline-none"
                        />
                        <input
                            data-testid="charge-day"
                            type="number"
                            min="1"
                            max="31"
                            value={chargeForm.day_of_month}
                            onChange={(e) => setChargeForm({ ...chargeForm, day_of_month: e.target.value })}
                            placeholder="Jour"
                            className="col-span-3 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-red-500 text-gray-300 text-sm font-mono focus:outline-none"
                        />
                        <button
                            data-testid="charge-add"
                            onClick={addCharge}
                            className="col-span-12 h-9 bg-red-600 hover:bg-red-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Ajouter un prélèvement
                        </button>
                    </div>

                    {charges.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Aucun prélèvement enregistré
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                            {charges.items.map((c) => {
                                const upcoming = (c.day_of_month || 0) >= todayDay;
                                return (
                                    <div
                                        key={c.id}
                                        data-testid={`charge-item-${c.id}`}
                                        className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-[#222222]"
                                    >
                                        <span className={`font-mono text-[10px] w-8 text-center ${upcoming ? "text-red-400" : "text-gray-600"}`}>
                                            {String(c.day_of_month).padStart(2, "0")}
                                        </span>
                                        <span className="flex-1 text-sm text-white truncate">{c.label}</span>
                                        <span className={`font-mono text-sm font-bold shrink-0 ${upcoming ? "text-red-400" : "text-gray-500 line-through"}`}>
                                            {fmt(c.amount)} €
                                        </span>
                                        <button
                                            data-testid={`charge-delete-${c.id}`}
                                            onClick={() => deleteCharge(c.id)}
                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                            aria-label="Supprimer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="flex justify-between pt-2 text-[11px] font-mono">
                                <span className="text-gray-400 uppercase tracking-wider text-[10px]">À venir ce mois</span>
                                <span className="text-red-400 font-bold">−{fmt(chargesUpcomingTotal)} €</span>
                            </div>
                        </div>
                    )}
                </SectionCard>

                {/* Abonnements clients récurrents */}
                <SectionCard>
                    <SectionTitle icon={ArrowDownToLine} accent="text-green-400">
                        Abonnements clients · {revenues.count || revenues.items.length} client{(revenues.count || revenues.items.length) > 1 ? "s" : ""} · {fmt(revenues.total)} €
                    </SectionTitle>
                    <p className="text-[10px] text-gray-500 font-mono mb-3">
                        Revenus récurrents — clients en maintenance mensuelle
                    </p>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                        <input
                            data-testid="revenue-label"
                            type="text"
                            value={revenueForm.label}
                            onChange={(e) => setRevenueForm({ ...revenueForm, label: e.target.value })}
                            placeholder="Nom client"
                            className="col-span-6 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-green-500 text-white text-sm focus:outline-none"
                        />
                        <input
                            data-testid="revenue-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={revenueForm.amount}
                            onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                            placeholder="€"
                            className="col-span-3 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-green-500 text-green-400 text-sm font-mono focus:outline-none"
                        />
                        <input
                            data-testid="revenue-day"
                            type="number"
                            min="1"
                            max="31"
                            value={revenueForm.day_of_month}
                            onChange={(e) => setRevenueForm({ ...revenueForm, day_of_month: e.target.value })}
                            placeholder="Jour"
                            className="col-span-3 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-green-500 text-gray-300 text-sm font-mono focus:outline-none"
                        />
                        <label className="col-span-12 flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase font-mono text-gray-400 cursor-pointer select-none">
                            <input
                                data-testid="revenue-prepaid"
                                type="checkbox"
                                checked={!!revenueForm.prepaid}
                                onChange={(e) => setRevenueForm({ ...revenueForm, prepaid: e.target.checked })}
                                className="h-3.5 w-3.5 accent-blue-500"
                            />
                            Prépayé (annuel · n'affecte pas le prévisionnel)
                        </label>
                        <button
                            data-testid="revenue-add"
                            onClick={addRevenue}
                            className="col-span-12 h-9 bg-green-600 hover:bg-green-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Ajouter un abonnement
                        </button>
                    </div>

                    {revenues.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Aucun abonnement enregistré
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                            {revenues.items.map((r) => {
                                const upcoming = !r.prepaid && (r.day_of_month || 0) >= todayDay;
                                return (
                                    <div
                                        key={r.id}
                                        data-testid={`revenue-item-${r.id}`}
                                        className={`flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border ${r.prepaid ? "border-blue-900/60" : "border-[#222222]"}`}
                                    >
                                        <span className={`font-mono text-[10px] w-8 text-center ${upcoming ? "text-green-400" : "text-gray-600"}`}>
                                            {r.prepaid ? "AN" : String(r.day_of_month).padStart(2, "0")}
                                        </span>
                                        <span className="flex-1 text-sm text-white truncate flex items-center gap-2">
                                            {r.label}
                                            {r.prepaid && (
                                                <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-blue-400 border border-blue-600/50 px-1.5 py-[1px]">
                                                    prépayé
                                                </span>
                                            )}
                                        </span>
                                        <span className={`font-mono text-sm font-bold shrink-0 ${r.prepaid ? "text-blue-400" : upcoming ? "text-green-400" : "text-gray-500 line-through"}`}>
                                            {fmt(r.amount)} €
                                        </span>
                                        <button
                                            data-testid={`revenue-delete-${r.id}`}
                                            onClick={() => deleteRevenue(r.id)}
                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                            aria-label="Supprimer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                            <div className="flex justify-between pt-2 text-[11px] font-mono">
                                <span className="text-gray-400 uppercase tracking-wider text-[10px]">À venir ce mois</span>
                                <span className="text-green-400 font-bold">+{fmt(revenuesUpcomingTotal)} €</span>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Paiements à préparer + Stock réel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Paiements à préparer */}
                <SectionCard>
                    <SectionTitle icon={FileCheck2} accent="text-yellow-400">
                        Paiements à préparer · {toPrepare.count || toPrepare.items.length}
                        {toPrepare.total > 0 && ` · ${fmt(toPrepare.total)} €`}
                    </SectionTitle>
                    <p className="text-[10px] text-gray-500 font-mono mb-3">
                        Devis à envoyer / factures à émettre — pour mémoire
                    </p>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                        <input
                            data-testid="prepare-label"
                            type="text"
                            value={prepareForm.label}
                            onChange={(e) => setPrepareForm({ ...prepareForm, label: e.target.value })}
                            placeholder="Client + objet (ex: LUKADHESIF — nouveau PC)"
                            className="col-span-8 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                        />
                        <input
                            data-testid="prepare-amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={prepareForm.amount}
                            onChange={(e) => setPrepareForm({ ...prepareForm, amount: e.target.value })}
                            placeholder="€ (optionnel)"
                            className="col-span-4 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-300 text-sm font-mono focus:outline-none"
                        />
                        <button
                            data-testid="prepare-add"
                            onClick={addPrepare}
                            className="col-span-12 h-9 bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Ajouter un devis à préparer
                        </button>
                    </div>

                    {toPrepare.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Aucun devis à préparer
                        </p>
                    ) : (
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                            {toPrepare.items.map((p) => (
                                <div
                                    key={p.id}
                                    data-testid={`prepare-item-${p.id}`}
                                    className="flex items-center gap-2 px-3 py-2 bg-[#0d0d0d] border border-[#222222]"
                                >
                                    <span className="flex-1 text-sm text-white truncate">{p.label}</span>
                                    {p.amount > 0 && (
                                        <span className="font-mono text-sm font-bold text-yellow-300 shrink-0">
                                            {fmt(p.amount)} €
                                        </span>
                                    )}
                                    <button
                                        data-testid={`prepare-delete-${p.id}`}
                                        onClick={() => deletePrepare(p.id)}
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

                {/* Stock réel */}
                <SectionCard>
                    <SectionTitle icon={Wallet} accent="text-purple-400">
                        Stock réel · {stock.fixes + stock.portables} pc · {fmt(stock.total_value)} €
                    </SectionTitle>
                    <p className="text-[10px] text-gray-500 font-mono mb-3">
                        Pour info — n'affecte ni le CA ni le prévisionnel
                    </p>
                    <div className="grid grid-cols-12 gap-2 mb-3">
                        <input
                            data-testid="stock-label"
                            type="text"
                            value={stockForm.label}
                            onChange={(e) => setStockForm({ ...stockForm, label: e.target.value })}
                            placeholder="Modèle (ex: Lenovo ThinkCentre Neo 50q Gen5)"
                            className="col-span-7 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-purple-500 text-white text-sm focus:outline-none"
                        />
                        <select
                            data-testid="stock-kind"
                            value={stockForm.kind}
                            onChange={(e) => setStockForm({ ...stockForm, kind: e.target.value })}
                            className="col-span-5 h-10 px-2 bg-[#0d0d0d] border border-[#333333] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                        >
                            <option value="fixe">PC Fixe</option>
                            <option value="portable">Portable</option>
                        </select>
                        <input
                            data-testid="stock-serial"
                            type="text"
                            value={stockForm.serial}
                            onChange={(e) => setStockForm({ ...stockForm, serial: e.target.value })}
                            placeholder="N° série / Case N° (ex: YJ029KR0)"
                            className="col-span-12 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-purple-500 text-yellow-300 text-sm font-mono focus:outline-none"
                        />

                        {/* Specs structurées */}
                        <div className="col-span-12 border border-[#333333] bg-[#0a0a0a] p-3 space-y-2">
                            <div className="text-[9px] tracking-[0.2em] uppercase font-mono text-purple-400 mb-2">Composants</div>

                            {/* Écran + résolution — portable seulement */}
                            {stockForm.kind === "portable" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={stockForm.specs.screen}
                                        onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, screen: e.target.value } })}
                                        className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                    >
                                        <option value="">Écran…</option>
                                        <option value='14"'>14"</option>
                                        <option value='15,6"'>15,6"</option>
                                        <option value='16"'>16"</option>
                                        <option value='17"'>17"</option>
                                    </select>
                                    <select
                                        value={stockForm.specs.resolution}
                                        onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, resolution: e.target.value } })}
                                        className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                    >
                                        <option value="">Résolution…</option>
                                        <option value="FHD 1920x1080">FHD 1920x1080</option>
                                        <option value="2K">2K</option>
                                        <option value="4K">4K</option>
                                        <option value="5K">5K</option>
                                    </select>
                                </div>
                            )}

                            {/* CPU */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={stockForm.specs.cpu_brand}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, cpu_brand: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">Marque CPU…</option>
                                    <option value="Intel Core i3">Intel Core i3</option>
                                    <option value="Intel Core i5">Intel Core i5</option>
                                    <option value="Intel Core i7">Intel Core i7</option>
                                    <option value="Intel Core i9">Intel Core i9</option>
                                    <option value="AMD Ryzen 5">AMD Ryzen 5</option>
                                    <option value="AMD Ryzen 7">AMD Ryzen 7</option>
                                    <option value="AMD Ryzen 9">AMD Ryzen 9</option>
                                </select>
                                <select
                                    value={stockForm.specs.cpu_model}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, cpu_model: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">Génération…</option>
                                    <option value="11ème gén">11ème gén</option>
                                    <option value="12ème gén">12ème gén</option>
                                    <option value="13ème gén">13ème gén</option>
                                    <option value="14ème gén">14ème gén</option>
                                    <option value="15ème gén">15ème gén</option>
                                </select>
                            </div>

                            {/* RAM + Storage */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={stockForm.specs.ram}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, ram: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">RAM…</option>
                                    <option value="8 Go DDR4">8 Go DDR4</option>
                                    <option value="16 Go DDR4">16 Go DDR4</option>
                                    <option value="32 Go DDR4">32 Go DDR4</option>
                                    <option value="8 Go DDR5">8 Go DDR5</option>
                                    <option value="16 Go DDR5">16 Go DDR5</option>
                                    <option value="32 Go DDR5">32 Go DDR5</option>
                                    <option value="64 Go DDR5">64 Go DDR5</option>
                                </select>
                                <select
                                    value={stockForm.specs.storage}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, storage: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">Stockage…</option>
                                    <option value="NVMe 256 Go">NVMe 256 Go</option>
                                    <option value="NVMe Hynix 512 Go">NVMe Hynix 512 Go</option>
                                    <option value="NVMe 1 To">NVMe 1 To</option>
                                    <option value="NVMe 2 To">NVMe 2 To</option>
                                    <option value="SSD 512 Go">SSD 512 Go</option>
                                    <option value="HDD 1 To">HDD 1 To</option>
                                </select>
                            </div>

                            {/* GPU + Wifi */}
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={stockForm.specs.gpu}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, gpu: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">GPU…</option>
                                    <option value="Intégré Intel">Intégré Intel</option>
                                    <option value="Intégré AMD">Intégré AMD</option>
                                    <option value="Nvidia RTX 3050">Nvidia RTX 3050</option>
                                    <option value="Nvidia RTX 4050">Nvidia RTX 4050</option>
                                    <option value="Nvidia RTX 4060">Nvidia RTX 4060</option>
                                    <option value="Nvidia RTX 4070">Nvidia RTX 4070</option>
                                </select>
                                <select
                                    value={stockForm.specs.wifi}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, wifi: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">Wifi…</option>
                                    <option value="Wifi 5">Wifi 5</option>
                                    <option value="Wifi 6">Wifi 6</option>
                                    <option value="Wifi 6E">Wifi 6E</option>
                                    <option value="Wifi 7">Wifi 7</option>
                                    <option value="Aucun">Aucun</option>
                                </select>
                            </div>

                            {/* Webcam + Garantie (portable only for webcam) */}
                            <div className="grid grid-cols-2 gap-2">
                                {stockForm.kind === "portable" ? (
                                    <select
                                        value={stockForm.specs.webcam}
                                        onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, webcam: e.target.value } })}
                                        className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                    >
                                        <option value="">Webcam…</option>
                                        <option value="Avec fermeture">Avec fermeture</option>
                                        <option value="Sans fermeture">Sans fermeture</option>
                                        <option value="Aucune">Aucune</option>
                                    </select>
                                ) : <span />}
                                <select
                                    value={stockForm.specs.warranty}
                                    onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, warranty: e.target.value } })}
                                    className="h-9 px-2 bg-[#0d0d0d] border border-[#222222] focus:border-purple-500 text-white text-[11px] font-mono focus:outline-none"
                                >
                                    <option value="">Garantie constructeur…</option>
                                    <option value="1 an">1 an</option>
                                    <option value="2 ans">2 ans</option>
                                    <option value="3 ans">3 ans</option>
                                </select>
                            </div>

                            {/* Checkboxes */}
                            <div className="flex flex-wrap gap-4 pt-1">
                                {stockForm.specs.wifi && stockForm.specs.wifi !== "Aucun" && (
                                    <label className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase font-mono text-gray-400 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!stockForm.specs.bluetooth}
                                            onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, bluetooth: e.target.checked } })}
                                            className="h-3.5 w-3.5 accent-purple-500"
                                        />
                                        Bluetooth
                                    </label>
                                )}
                                {stockForm.kind === "portable" && (
                                    <label className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase font-mono text-gray-400 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={!!stockForm.specs.keyboard_backlit}
                                            onChange={(e) => setStockForm({ ...stockForm, specs: { ...stockForm.specs, keyboard_backlit: e.target.checked } })}
                                            className="h-3.5 w-3.5 accent-purple-500"
                                        />
                                        Clavier rétro-éclairé
                                    </label>
                                )}
                            </div>
                        </div>

                        <input
                            data-testid="stock-qty"
                            type="number"
                            min="1"
                            value={stockForm.quantity}
                            onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                            placeholder="Qté"
                            className="col-span-4 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-purple-500 text-gray-300 text-sm font-mono focus:outline-none"
                        />
                        <input
                            data-testid="stock-unit-value"
                            type="number"
                            step="0.01"
                            min="0"
                            value={stockForm.unit_value}
                            onChange={(e) => setStockForm({ ...stockForm, unit_value: e.target.value })}
                            placeholder="Valeur unit. €"
                            className="col-span-8 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-purple-500 text-purple-300 text-sm font-mono focus:outline-none"
                        />
                        <button
                            data-testid="stock-add"
                            onClick={addStock}
                            className="col-span-12 h-9 bg-purple-600 hover:bg-purple-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Ajouter au stock
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                            <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">PC Fixes</div>
                            <div className="font-mono text-lg font-bold text-purple-300">{stock.fixes}</div>
                        </div>
                        <div className="border border-[#333333] bg-[#0d0d0d] p-2">
                            <div className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-mono">Portables</div>
                            <div className="font-mono text-lg font-bold text-purple-300">{stock.portables}</div>
                        </div>
                    </div>

                    {stock.items.length === 0 ? (
                        <p className="text-[11px] text-gray-500 font-mono py-6 text-center border border-[#333333] border-dashed">
                            Stock vide
                        </p>
                    ) : (
                        <div className="space-y-1.5 max-h-96 overflow-y-auto">
                            {stock.items.map((s) => (
                                <div
                                    key={s.id}
                                    data-testid={`stock-item-${s.id}`}
                                    className="bg-[#0d0d0d] border border-[#222222] p-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] tracking-[0.15em] uppercase font-mono text-purple-400 w-14 shrink-0">
                                            {s.kind === "portable" ? "PORT." : "FIXE"}
                                        </span>
                                        <span className="flex-1 text-sm text-white truncate">{s.label}</span>
                                        <span className="font-mono text-[11px] text-gray-400 shrink-0">×{s.quantity}</span>
                                        {s.unit_value > 0 && (
                                            <span className="font-mono text-sm font-bold text-purple-300 shrink-0">
                                                {fmt(s.quantity * s.unit_value)} €
                                            </span>
                                        )}
                                        <button
                                            data-testid={`stock-delete-${s.id}`}
                                            onClick={() => deleteStock(s.id)}
                                            className="text-gray-500 hover:text-red-500 transition-colors"
                                            aria-label="Supprimer"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {s.serial && (
                                        <div className="text-[10px] text-yellow-400/80 font-mono mt-1 ml-16">
                                            S/N : {s.serial}
                                        </div>
                                    )}
                                    {s.specs && typeof s.specs === "object" && Object.values(s.specs).some((v) => v !== "" && v !== false) && (
                                        <div className="text-[10px] text-gray-400 font-mono mt-1 ml-16 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                            {s.specs.screen && <div><span className="text-gray-600">Écran :</span> {s.specs.screen}</div>}
                                            {s.specs.resolution && <div><span className="text-gray-600">Résolution :</span> {s.specs.resolution}</div>}
                                            {(s.specs.cpu_brand || s.specs.cpu_model) && <div className="col-span-2"><span className="text-gray-600">CPU :</span> {[s.specs.cpu_brand, s.specs.cpu_model].filter(Boolean).join(" · ")}</div>}
                                            {s.specs.ram && <div><span className="text-gray-600">RAM :</span> {s.specs.ram}</div>}
                                            {s.specs.storage && <div><span className="text-gray-600">Disque :</span> {s.specs.storage}</div>}
                                            {s.specs.gpu && <div><span className="text-gray-600">GPU :</span> {s.specs.gpu}</div>}
                                            {s.specs.wifi && <div><span className="text-gray-600">Wifi :</span> {s.specs.wifi}{s.specs.bluetooth ? " + BT" : ""}</div>}
                                            {s.specs.webcam && <div><span className="text-gray-600">Webcam :</span> {s.specs.webcam}</div>}
                                            {s.specs.keyboard_backlit && <div><span className="text-gray-600">Clavier :</span> rétro-éclairé</div>}
                                            {s.specs.warranty && <div className="col-span-2"><span className="text-gray-600">Garantie :</span> <span className="text-green-400">{s.specs.warranty}</span></div>}
                                        </div>
                                    )}
                                    {/* fallback : ancien format texte libre */}
                                    {s.specs && typeof s.specs === "string" && s.specs && (
                                        <pre className="text-[10px] text-gray-400 font-mono mt-1 ml-16 whitespace-pre-wrap leading-relaxed">
                                            {s.specs}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Mémo — Versements femme */}
            <SectionCard>
                <SectionTitle icon={Coins} accent="text-pink-400">
                    Mémo — Courses femme · {fmt(wife.paid)} / {fmt(wife.target)} €
                </SectionTitle>
                <p className="text-[10px] text-gray-500 font-mono mb-3">
                    Objectif {fmt(wife.target)} €/mois · reset auto chaque mois
                </p>

                {/* Progress bar */}
                <div className="h-2 bg-[#0d0d0d] border border-[#222222] mb-1 relative overflow-hidden">
                    <div
                        data-testid="wife-progress"
                        className={`h-full ${wife.paid >= wife.target ? "bg-green-500" : "bg-pink-500"} transition-all`}
                        style={{ width: `${Math.min(100, (wife.paid / wife.target) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] font-mono mb-3">
                    <span className="text-gray-500">Versé : <span className={wife.paid >= wife.target ? "text-green-400" : "text-pink-400"}>{fmt(wife.paid)} €</span></span>
                    <span className="text-gray-500">Reste dû : <span className={wife.remaining === 0 ? "text-green-400" : "text-red-400"}>{fmt(wife.remaining)} €</span></span>
                </div>

                <div className="grid grid-cols-12 gap-2 mb-3">
                    <input
                        data-testid="wife-amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={wifeForm.amount}
                        onChange={(e) => setWifeForm({ ...wifeForm, amount: e.target.value })}
                        placeholder="Montant versé €"
                        className="col-span-4 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-pink-500 text-pink-300 text-sm font-mono focus:outline-none"
                    />
                    <input
                        data-testid="wife-note"
                        type="text"
                        value={wifeForm.note}
                        onChange={(e) => setWifeForm({ ...wifeForm, note: e.target.value })}
                        placeholder="Note (optionnel)"
                        className="col-span-5 h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-pink-500 text-white text-sm focus:outline-none"
                    />
                    <button
                        data-testid="wife-add"
                        onClick={addWifePayment}
                        className="col-span-3 h-10 bg-pink-600 hover:bg-pink-500 text-white text-[10px] tracking-[0.15em] uppercase font-mono font-semibold flex items-center justify-center gap-1"
                    >
                        <Plus className="h-3 w-3" />
                        Versé
                    </button>
                </div>

                {wife.items.length === 0 ? (
                    <p className="text-[11px] text-gray-500 font-mono py-4 text-center border border-[#333333] border-dashed">
                        Aucun versement ce mois
                    </p>
                ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {wife.items.map((w) => (
                            <div
                                key={w.id}
                                data-testid={`wife-item-${w.id}`}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#0d0d0d] border border-[#222222]"
                            >
                                <span className="text-[11px] font-mono text-gray-400 w-20 shrink-0">{w.date}</span>
                                <span className="flex-1 text-sm text-white truncate">{w.note || "—"}</span>
                                <span className="font-mono text-sm font-bold text-pink-400 shrink-0">
                                    {fmt(w.amount)} €
                                </span>
                                <button
                                    data-testid={`wife-delete-${w.id}`}
                                    onClick={() => deleteWifePayment(w.id)}
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
