import { TrendingUp, TrendingDown, Minus, FileText, Package } from "lucide-react";

const fmt = (n) =>
    new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n || 0);

const Row = ({ label, value, color = "text-white", sign, testid, accent, hint }) => (
    <div
        data-testid={testid}
        className="flex items-center justify-between py-3 border-b border-[#222222] last:border-0"
    >
        <div className="flex items-center gap-2 min-w-0">
            {accent && (
                <span
                    className="h-2 w-2 inline-block shrink-0"
                    style={{ backgroundColor: accent }}
                />
            )}
            <span className="text-xs tracking-wide text-gray-400 truncate">{label}</span>
            {hint && (
                <span className="text-[10px] text-gray-600 font-mono shrink-0">{hint}</span>
            )}
        </div>
        <span className={`font-mono text-sm tabular-nums ${color}`}>
            {sign}
            {fmt(value)} €
        </span>
    </div>
);

export default function AssemblyResult({ calc, clientName }) {
    const isProfit = calc.netProfit > 0;
    const isLoss = calc.netProfit < 0;
    const isZero = calc.netProfit === 0;

    const profitColor = isProfit
        ? "text-green-500"
        : isLoss
            ? "text-red-500"
            : "text-gray-400";

    const StatusIcon = isProfit ? TrendingUp : isLoss ? TrendingDown : Minus;

    return (
        <section
            data-testid="assembly-result"
            className="bg-[#0d0d0d] border border-[#333333] p-6 md:p-8 relative scanlines overflow-hidden"
        >
            <div className="flex items-center justify-between mb-6 font-mono text-[10px] tracking-[0.25em] uppercase">
                <div className="flex items-center gap-2 text-gray-500">
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${isProfit ? "bg-green-500" : isLoss ? "bg-red-500" : "bg-yellow-500"} flicker`}
                    />
                    <span>Devis // Output</span>
                </div>
                <span className="text-gray-600">[02/06]</span>
            </div>

            <div className="mb-6">
                <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono">
                    Client
                </span>
                <div
                    data-testid="asm-result-client"
                    className="text-xl font-semibold tracking-tight text-white mt-1 truncate"
                >
                    {clientName || <span className="text-gray-600">— sans nom —</span>}
                </div>
            </div>

            {/* Components breakdown */}
            {calc.componentsBreakdown.length > 0 && (
                <div className="bg-[#111111] border border-[#222222] p-5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            Composants
                        </div>
                        <span className="text-[10px] font-mono text-gray-600">
                            {calc.componentsBreakdown.length} ligne{calc.componentsBreakdown.length > 1 ? "s" : ""}
                        </span>
                    </div>
                    {calc.componentsBreakdown.map((c) => (
                        <div
                            key={c.key}
                            data-testid={`result-comp-${c.key}`}
                            className="flex items-center justify-between gap-2 py-2 border-b border-[#222222]/50 last:border-0"
                        >
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[11px] text-gray-400 truncate">{c.label}</span>
                                {c.name && (
                                    <span className="text-[10px] text-gray-600 font-mono truncate">
                                        {c.name}
                                    </span>
                                )}
                            </div>
                            <span className="font-mono text-xs text-gray-300 shrink-0">
                                {fmt(c.cost)} €
                            </span>
                        </div>
                    ))}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gray-400">
                            Sous-total pièces
                        </span>
                        <span className="font-mono text-sm font-bold text-yellow-500">
                            {fmt(calc.partsCost)} €
                        </span>
                    </div>
                </div>
            )}

            {/* ARTICLES (13%) */}
            {calc.articlesTotal > 0 && (
                <div className="bg-[#111111] border border-[#222222] p-5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] tracking-[0.3em] uppercase font-mono flex items-center gap-2 text-orange-400">
                            <FileText className="h-3 w-3" />
                            Articles · 13%
                        </div>
                    </div>
                    <Row
                        testid="asm-row-parts-sale"
                        label="Pièces facturées"
                        value={calc.partsSale}
                        sign="+"
                        color="text-white"
                    />
                    {calc.licenseFee > 0 && (
                        <Row
                            testid="asm-row-license"
                            label="Licence Windows"
                            value={calc.licenseFee}
                            sign="+"
                            color="text-orange-400"
                            accent="#F97316"
                        />
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-orange-300">
                            Sous-total articles
                        </span>
                        <span className="font-mono text-sm font-bold text-white">
                            {fmt(calc.articlesTotal)} €
                        </span>
                    </div>
                </div>
            )}

            {/* PRESTATIONS (23%) */}
            {calc.prestationsTotal > 0 && (
                <div className="bg-[#111111] border border-[#222222] p-5 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] tracking-[0.3em] uppercase font-mono flex items-center gap-2 text-blue-400">
                            <FileText className="h-3 w-3" />
                            Prestations · 23%
                        </div>
                    </div>
                    {calc.startupDataFee > 0 && (
                        <Row
                            testid="asm-row-startup-data"
                            label="Premier démarrage + Récup données"
                            value={calc.startupDataFee}
                            sign="+"
                            color="text-blue-400"
                            accent="#3B82F6"
                        />
                    )}
                    {calc.travel > 0 && (
                        <Row
                            testid="asm-row-travel"
                            label="Déplacement"
                            value={calc.travel}
                            sign="+"
                            color="text-blue-400"
                            accent="#3B82F6"
                            hint={`(${calc.travelLabel})`}
                        />
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-blue-300">
                            Sous-total prestations
                        </span>
                        <span className="font-mono text-sm font-bold text-white">
                            {fmt(calc.prestationsTotal)} €
                        </span>
                    </div>
                </div>
            )}

            {/* TOTAL FACTURE */}
            <div className="flex items-center justify-between bg-[#111111] border border-yellow-500/30 px-4 py-3 mb-6">
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-yellow-300">
                    Total facturé
                </span>
                <span
                    data-testid="asm-total-billed"
                    className="font-mono text-2xl font-bold text-yellow-500"
                >
                    {fmt(calc.totalBilled)} €
                </span>
            </div>

            {/* CHARGES */}
            <div className="bg-[#111111] border border-[#222222] p-5 mb-6">
                <div className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono mb-2">
                    Charges
                </div>

                <Row
                    testid="asm-row-parts-cost"
                    label="Coût pièces"
                    value={calc.partsCost}
                    sign="−"
                    color="text-gray-300"
                />
                <Row
                    testid="asm-row-lbc"
                    label="Taxe Leboncoin (5%)"
                    value={calc.lbcTax}
                    sign="−"
                    color="text-orange-400"
                    accent="#F97316"
                />
                {calc.urssafArticles > 0 && (
                    <Row
                        testid="asm-row-urssaf-art"
                        label="URSSAF Articles 13%"
                        value={calc.urssafArticles}
                        sign="−"
                        color="text-orange-400"
                        accent="#F97316"
                    />
                )}
                {calc.urssafPrestations > 0 && (
                    <Row
                        testid="asm-row-urssaf-prest"
                        label="URSSAF Prestations 23%"
                        value={calc.urssafPrestations}
                        sign="−"
                        color="text-blue-400"
                        accent="#3B82F6"
                    />
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#333333]">
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-gray-400">
                        Total charges
                    </span>
                    <span className="font-mono text-sm font-bold text-white">
                        {fmt(calc.totalCosts)} €
                    </span>
                </div>
            </div>

            {/* Net hero */}
            <div className="border-t border-[#333333] pt-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono">
                        Bénéfice Net
                    </span>
                    <StatusIcon className={`h-4 w-4 ${profitColor}`} />
                </div>

                <div
                    data-testid="asm-net-profit"
                    className={`font-mono text-5xl md:text-6xl font-bold tracking-tighter leading-none ${profitColor}`}
                >
                    {isProfit ? "+" : ""}
                    {fmt(calc.netProfit)}
                    <span className="text-2xl ml-1 text-gray-500 font-medium">€</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div
                        data-testid="asm-margin-box"
                        className="border border-[#333333] bg-[#111111] p-3"
                    >
                        <div className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-mono">
                            Marge
                        </div>
                        <div className={`font-mono text-xl font-semibold mt-1 ${profitColor}`}>
                            {calc.hasData ? `${calc.margin}%` : "—"}
                        </div>
                    </div>
                    <div
                        data-testid="asm-urssaf-box"
                        className="border border-[#333333] bg-[#111111] p-3"
                    >
                        <div className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-mono">
                            URSSAF total
                        </div>
                        <div className="font-mono text-xl font-semibold mt-1 text-white">
                            {fmt(calc.urssaf)} €
                        </div>
                    </div>
                </div>

                <div
                    data-testid="asm-verdict"
                    className={`mt-6 px-4 py-3 border font-mono text-[11px] tracking-[0.2em] uppercase flex items-center justify-between ${
                        isProfit
                            ? "border-green-500/40 bg-green-500/5 text-green-400"
                            : isLoss
                                ? "border-red-500/40 bg-red-500/5 text-red-400"
                                : "border-[#333333] bg-[#111111] text-gray-500"
                    }`}
                >
                    <span>
                        {isZero
                            ? "// En attente de données"
                            : isProfit
                                ? "// Prestation rentable"
                                : "// Prestation non rentable"}
                    </span>
                    <span>
                        {isProfit && "✓ OK"}
                        {isLoss && "✗ KO"}
                        {isZero && "···"}
                    </span>
                </div>
            </div>
        </section>
    );
}
