import { useMemo, useState, useCallback } from "react";
import { Cpu, TrendingUp, TrendingDown, Activity, Zap, Wrench, Calculator as CalcIcon, Wallet } from "lucide-react";
import CalcForm from "@/components/CalcForm";
import ResultPanel from "@/components/ResultPanel";
import AssemblyForm from "@/components/AssemblyForm";
import AssemblyResult from "@/components/AssemblyResult";
import OneDrivePanel from "@/components/OneDrivePanel";
import FinanceTab from "@/components/FinanceTab";

export const TRAVEL_OPTIONS = [
    { key: "vauvert", label: "Vauvert", price: 10, hint: "Local" },
    { key: "zone15", label: "≤ 15 km", price: 20, hint: "Proche" },
    { key: "zone40", label: "15 – 40 km", price: 40, hint: "Moyen" },
    { key: "zone100", label: "40 – 100 km", price: 80, hint: "Loin" },
    { key: "mondial", label: "Mondial Relay", price: 25, hint: "Assurance incluse" },
    { key: "none", label: "Aucun — Atelier", price: 0, hint: "Sur place" },
];

export const FIXE_COMPONENTS = [
    { key: "carteMere", label: "Carte mère", icon: "Cpu" },
    { key: "processeur", label: "Processeur", icon: "Cpu" },
    { key: "carteGraphique", label: "Carte graphique", icon: "Monitor" },
    { key: "memoire", label: "Mémoire (RAM)", icon: "MemoryStick" },
    { key: "disqueDur", label: "Disque dur / SSD", icon: "HardDrive" },
    { key: "alimentation", label: "Alimentation", icon: "Plug" },
    { key: "boitier", label: "Boîtier", icon: "Box" },
    { key: "clavierSouris", label: "Clavier-souris", icon: "Keyboard" },
    { key: "ecran", label: "Écran", icon: "Monitor" },
];

export const PORTABLE_COMPONENTS = [
    { key: "modele", label: "Modèle / référence", icon: "Laptop" },
    { key: "accessoires", label: "Accessoires (chargeur, sacoche…)", icon: "Box" },
];

// URSSAF rates exact (auto-entrepreneur micro BIC/BNC avec versement libératoire)
export const RATE_URSSAF_PRESTA = 0.212;   // 21.2%
export const RATE_URSSAF_VENTE = 0.123;    // 12.3%
export const RATE_IMPOT_PRESTA = 0.017;    // 1.7% versement libératoire BIC presta
export const RATE_IMPOT_VENTE = 0.01;      // 1.0% versement libératoire BIC vente
export const RATE_FORMATION = 0.002;       // 0.2% CFP

// Totaux combinés par catégorie
export const RATE_ARTICLE = RATE_URSSAF_VENTE + RATE_IMPOT_VENTE + RATE_FORMATION;       // 13.5%
export const RATE_PRESTATION = RATE_URSSAF_PRESTA + RATE_IMPOT_PRESTA + RATE_FORMATION;  // 23.1%

const blankComponents = (list) =>
    Object.fromEntries(list.map((c) => [c.key, { name: "", cost: "", sale: "" }]));

export default function Calculator() {
    const [mode, setMode] = useState("quick");

    // Quick calculator (articles → 13%)
    const [values, setValues] = useState({
        itemName: "",
        date: new Date().toISOString().slice(0, 10),
        platform: "leboncoin",
        purchasePrice: "",
        salePrice: "",
        deliveryZone: "vauvert",
    });

    const calc = useMemo(() => {
        const purchase = parseFloat(values.purchasePrice) || 0;
        const sale = parseFloat(values.salePrice) || 0;
        const deliveryObj = TRAVEL_OPTIONS.find((t) => t.key === values.deliveryZone);
        const delivery = deliveryObj?.price || 0;
        const deliveryLabel = deliveryObj?.label || "";
        const lbcTax = +(purchase * 0.05).toFixed(2);
        const urssaf = +(sale * RATE_ARTICLE).toFixed(2);
        const totalCosts = +(purchase + lbcTax + delivery + urssaf).toFixed(2);
        const grossProfit = +(sale - purchase).toFixed(2);
        const netProfit = +(sale - totalCosts).toFixed(2);
        const margin = sale > 0 ? +((netProfit / sale) * 100).toFixed(1) : 0;
        const roi = purchase > 0 ? +((netProfit / purchase) * 100).toFixed(1) : 0;
        return {
            purchase, sale, delivery, deliveryLabel, lbcTax, urssaf,
            totalCosts, grossProfit, netProfit, margin, roi,
            hasData: sale > 0 || purchase > 0,
        };
    }, [values]);

    // Assembly state
    const [asm, setAsm] = useState({
        clientName: "",
        clientAddress: "",
        clientPostal: "",
        clientCity: "",
        clientPhone: "",
        clientEmail: "",
        date: new Date().toISOString().slice(0, 10),
        machineType: "fixe",
        componentsFixe: blankComponents(FIXE_COMPONENTS),
        componentsPortable: blankComponents(PORTABLE_COMPONENTS),
        partsShipping: "10",
        // Articles (13%)
        licenseWindows: true,
        amountLicense: "100",
        // Prestations (23%) — radio: "withData" | "withoutData" | "none"
        serviceVariant: "withData",
        amountWithData: "60",
        amountWithoutData: "40",
        travelZone: "vauvert",
    });

    const asmCalc = useMemo(() => {
        const components =
            asm.machineType === "fixe" ? asm.componentsFixe : asm.componentsPortable;
        const compList =
            asm.machineType === "fixe" ? FIXE_COMPONENTS : PORTABLE_COMPONENTS;

        const partsCost = +compList
            .reduce((sum, c) => sum + (parseFloat(components[c.key]?.cost) || 0), 0)
            .toFixed(2);
        const partsSale = +compList
            .reduce((sum, c) => sum + (parseFloat(components[c.key]?.sale) || 0), 0)
            .toFixed(2);

        const partsShipping = parseFloat(asm.partsShipping) || 0;

        const licenseFee = asm.licenseWindows ? parseFloat(asm.amountLicense) || 0 : 0;

        let serviceFee = 0;
        let serviceLabel = "";
        if (asm.serviceVariant === "withData") {
            serviceFee = parseFloat(asm.amountWithData) || 0;
            serviceLabel = "Premier démarrage + Récup. données";
        } else if (asm.serviceVariant === "withoutData") {
            serviceFee = parseFloat(asm.amountWithoutData) || 0;
            serviceLabel = "Premier démarrage";
        }

        const travelObj = TRAVEL_OPTIONS.find((t) => t.key === asm.travelZone);
        const travel = travelObj?.price || 0;

        // Articles bucket (13%)
        const articlesTotal = +(partsSale + licenseFee).toFixed(2);
        // Prestations bucket (23%)
        const prestationsTotal = +(serviceFee + travel).toFixed(2);

        const lbcTax = +(partsCost * 0.05).toFixed(2);
        const urssafArticles = +(articlesTotal * RATE_ARTICLE).toFixed(2);
        const urssafPrestations = +(prestationsTotal * RATE_PRESTATION).toFixed(2);
        const urssaf = +(urssafArticles + urssafPrestations).toFixed(2);

        const totalBilled = +(articlesTotal + prestationsTotal).toFixed(2);
        const totalCosts = +(partsCost + lbcTax + partsShipping + urssaf).toFixed(2);
        const netProfit = +(totalBilled - totalCosts).toFixed(2);
        const margin = totalBilled > 0 ? +((netProfit / totalBilled) * 100).toFixed(1) : 0;

        return {
            partsCost, partsSale, lbcTax, partsShipping,
            licenseFee, serviceFee, serviceLabel, travel,
            travelLabel: travelObj?.label,
            articlesTotal, prestationsTotal,
            urssafArticles, urssafPrestations, urssaf,
            totalBilled, totalCosts, netProfit, margin,
            hasData: totalBilled > 0,
            componentsBreakdown: compList
                .map((c) => ({
                    key: c.key,
                    label: c.label,
                    name: components[c.key]?.name || "",
                    cost: parseFloat(components[c.key]?.cost) || 0,
                    sale: parseFloat(components[c.key]?.sale) || 0,
                }))
                .filter((c) => c.cost > 0 || c.sale > 0 || c.name),
        };
    }, [asm]);

    return (
        <main data-testid="calculator-page" className="relative z-10 min-h-screen text-white">
            <header className="border-b border-[#262626]">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-yellow-500 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-black" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-mono">
                                Reseller Terminal
                            </span>
                            <span className="text-sm font-semibold tracking-tight">
                                BÉNÉFICE.NET<span className="text-yellow-500">/</span>v4
                            </span>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-xs font-mono text-gray-500">
                        <span className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 flicker" />
                            <span>SYSTEM ONLINE</span>
                        </span>
                        <span>{new Date().toLocaleDateString("fr-FR")}</span>
                    </div>
                </div>
            </header>

            <section className="border-b border-[#262626] bg-[#111111]">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-10 md:py-14">
                    <div className="flex flex-col gap-8">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-yellow-500 font-mono mb-4">
                                <Zap className="h-3 w-3" /> Outil de calcul de bénéfice
                            </span>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[0.95]">
                                Deux calculs,<br />
                                <span className="text-yellow-500">zéro erreur.</span>
                            </h1>
                            <p className="mt-5 text-base text-gray-400 max-w-xl">
                                Articles 13,5% · Prestations 23,1% — URSSAF calculée automatiquement
                                selon la nature de chaque ligne.
                            </p>
                        </div>

                        <div className="inline-flex border border-[#262626] bg-[#0d0d0d] p-1 w-fit flex-wrap">
                            <button
                                data-testid="tab-quick"
                                onClick={() => setMode("quick")}
                                className={`flex items-center gap-2 px-5 py-3 text-xs tracking-[0.2em] uppercase font-mono transition-all ${
                                    mode === "quick"
                                        ? "bg-yellow-500 text-black"
                                        : "text-gray-500 hover:text-white"
                                }`}
                            >
                                <CalcIcon className="h-3.5 w-3.5" />
                                Calcul rapide
                            </button>
                            <button
                                data-testid="tab-assembly"
                                onClick={() => setMode("assembly")}
                                className={`flex items-center gap-2 px-5 py-3 text-xs tracking-[0.2em] uppercase font-mono transition-all ${
                                    mode === "assembly"
                                        ? "bg-yellow-500 text-black"
                                        : "text-gray-500 hover:text-white"
                                }`}
                            >
                                <Wrench className="h-3.5 w-3.5" />
                                Assemblage PC
                            </button>
                            <button
                                data-testid="tab-finance"
                                onClick={() => setMode("finance")}
                                className={`flex items-center gap-2 px-5 py-3 text-xs tracking-[0.2em] uppercase font-mono transition-all ${
                                    mode === "finance"
                                        ? "bg-yellow-500 text-black"
                                        : "text-gray-500 hover:text-white"
                                }`}
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                Suivi Finance
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
                {mode === "finance" ? (
                    <FinanceTab />
                ) : mode === "quick" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7">
                            <CalcForm
                                values={values}
                                setValues={setValues}
                                travelOptions={TRAVEL_OPTIONS}
                            />
                        </div>
                        <div className="lg:col-span-5 lg:sticky lg:top-8">
                            <ResultPanel calc={calc} itemName={values.itemName} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7">
                            <OneDrivePanel
                                getDevisPayload={() => {
                                    if (!asmCalc.hasData && !asm.clientName) return null;
                                    const compDetail = asmCalc.componentsBreakdown
                                        .map((c) =>
                                            `${c.label}${c.name ? ` (${c.name})` : ""}: ${c.cost.toFixed(2)}€`
                                        )
                                        .join(" | ");
                                    return {
                                        date: asm.date,
                                        clientName: asm.clientName,
                                        clientAddress: asm.clientAddress,
                                        clientPostal: asm.clientPostal,
                                        clientCity: asm.clientCity,
                                        clientPhone: asm.clientPhone,
                                        clientEmail: asm.clientEmail,
                                        machineType: asm.machineType,
                                        componentsDetail: compDetail,
                                        partsCost: asmCalc.partsCost,
                                        partsSale: asmCalc.partsSale,
                                        partsShipping: asmCalc.partsShipping,
                                        licenseFee: asmCalc.licenseFee,
                                        serviceFee: asmCalc.serviceFee,
                                        serviceLabel: asmCalc.serviceLabel,
                                        travelLabel: asmCalc.travelLabel || "",
                                        travelAmount: asmCalc.travel,
                                        totalBilled: asmCalc.totalBilled,
                                        lbcTax: asmCalc.lbcTax,
                                        urssafArticles: asmCalc.urssafArticles,
                                        urssafPrestations: asmCalc.urssafPrestations,
                                        netProfit: asmCalc.netProfit,
                                        margin: asmCalc.margin,
                                    };
                                }}
                            />
                            <AssemblyForm
                                asm={asm}
                                setAsm={setAsm}
                                travelOptions={TRAVEL_OPTIONS}
                                fixeComponents={FIXE_COMPONENTS}
                                portableComponents={PORTABLE_COMPONENTS}
                                partsCost={asmCalc.partsCost}
                                partsSale={asmCalc.partsSale}
                            />
                        </div>
                        <div className="lg:col-span-5 lg:sticky lg:top-8">
                            <AssemblyResult calc={asmCalc} clientName={asm.clientName} />
                        </div>
                    </div>
                )}
            </section>

            <footer className="border-t border-[#262626] mt-12">
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-[11px] tracking-[0.15em] uppercase text-gray-500">
                    <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        <span>URSSAF · Articles 13,5% / Prestations 23,1%</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-green-500" /> Profit
                        </span>
                        <span className="flex items-center gap-1.5">
                            <TrendingDown className="h-3 w-3 text-red-500" /> Perte
                        </span>
                    </div>
                </div>
            </footer>
        </main>
    );
}
