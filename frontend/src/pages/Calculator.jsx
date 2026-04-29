import { useMemo, useState } from "react";
import { Cpu, TrendingUp, TrendingDown, Activity, Zap, Wrench, Calculator as CalcIcon } from "lucide-react";
import CalcForm from "@/components/CalcForm";
import ResultPanel from "@/components/ResultPanel";
import AssemblyForm from "@/components/AssemblyForm";
import AssemblyResult from "@/components/AssemblyResult";

export default function Calculator() {
    const [mode, setMode] = useState("quick"); // "quick" | "assembly"

    // Quick calculator state
    const [values, setValues] = useState({
        itemName: "",
        date: new Date().toISOString().slice(0, 10),
        platform: "leboncoin",
        purchasePrice: "",
        salePrice: "",
        delivery: "10",
    });

    const calc = useMemo(() => {
        const purchase = parseFloat(values.purchasePrice) || 0;
        const sale = parseFloat(values.salePrice) || 0;
        const delivery = parseFloat(values.delivery) || 0;
        const lbcTax = +(purchase * 0.05).toFixed(2);
        const urssaf = +(sale * 0.13).toFixed(2);
        const totalCosts = +(purchase + lbcTax + delivery + urssaf).toFixed(2);
        const grossProfit = +(sale - purchase).toFixed(2);
        const netProfit = +(sale - totalCosts).toFixed(2);
        const margin = sale > 0 ? +((netProfit / sale) * 100).toFixed(1) : 0;
        const roi = purchase > 0 ? +((netProfit / purchase) * 100).toFixed(1) : 0;
        return {
            purchase, sale, delivery, lbcTax, urssaf,
            totalCosts, grossProfit, netProfit, margin, roi,
            hasData: sale > 0 || purchase > 0,
        };
    }, [values]);

    // Assembly state
    const [asm, setAsm] = useState({
        clientName: "",
        date: new Date().toISOString().slice(0, 10),
        machineType: "fixe",
        partsCost: "",
        partsSale: "",
        baseService: true, // 100€ always
        dataRecovery: false, // 50€
        travelZone: "vauvert",
    });

    const TRAVEL = {
        vauvert: { label: "Vauvert", price: 10 },
        zone15: { label: "≤ 15 km", price: 20 },
        zone40: { label: "15 – 40 km", price: 40 },
        zone100: { label: "40 – 100 km", price: 80 },
        none: { label: "Aucun (sur place)", price: 0 },
    };

    const asmCalc = useMemo(() => {
        const partsCost = parseFloat(asm.partsCost) || 0;
        const partsSale = parseFloat(asm.partsSale) || 0;
        const lbcTax = +(partsCost * 0.05).toFixed(2);
        const baseFee = asm.baseService ? 100 : 0;
        const dataFee = asm.dataRecovery ? 50 : 0;
        const travel = TRAVEL[asm.travelZone]?.price || 0;

        const totalBilled = +(partsSale + baseFee + dataFee + travel).toFixed(2);
        const urssaf = +(totalBilled * 0.13).toFixed(2);
        const totalCosts = +(partsCost + lbcTax + urssaf).toFixed(2);
        const netProfit = +(totalBilled - totalCosts).toFixed(2);
        const margin = totalBilled > 0 ? +((netProfit / totalBilled) * 100).toFixed(1) : 0;

        return {
            partsCost, partsSale, lbcTax, baseFee, dataFee, travel,
            travelLabel: TRAVEL[asm.travelZone]?.label,
            totalBilled, urssaf, totalCosts, netProfit, margin,
            hasData: totalBilled > 0,
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
                                BÉNÉFICE.NET<span className="text-yellow-500">/</span>v2
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

            {/* Mode switcher */}
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
                                Revente de pièces ou prestation d'assemblage — choisis ton mode et
                                obtiens ton bénéfice net en temps réel.
                            </p>
                        </div>

                        {/* Mode tabs */}
                        <div className="inline-flex border border-[#262626] bg-[#0d0d0d] p-1 w-fit">
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
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">
                {mode === "quick" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7">
                            <CalcForm values={values} setValues={setValues} />
                        </div>
                        <div className="lg:col-span-5 lg:sticky lg:top-8">
                            <ResultPanel calc={calc} itemName={values.itemName} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-7">
                            <AssemblyForm asm={asm} setAsm={setAsm} TRAVEL={TRAVEL} />
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
                        <span>Calcul instantané — aucune donnée n'est sauvegardée</span>
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
