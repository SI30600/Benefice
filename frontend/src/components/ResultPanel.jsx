import { TrendingUp, TrendingDown, Minus } from "lucide-react";

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

export default function ResultPanel({ calc, itemName }) {
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
            data-testid="result-panel"
            className="bg-[#0d0d0d] border border-[#333333] p-6 md:p-8 relative scanlines overflow-hidden"
        >
            {/* Top status bar */}
            <div className="flex items-center justify-between mb-6 font-mono text-[10px] tracking-[0.25em] uppercase">
                <div className="flex items-center gap-2 text-gray-500">
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${isProfit ? "bg-green-500" : isLoss ? "bg-red-500" : "bg-yellow-500"} flicker`}
                    />
                    <span>Terminal // Output</span>
                </div>
                <span className="text-gray-600">[02/06]</span>
            </div>

            {/* Item header */}
            <div className="mb-6">
                <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono">
                    Objet analysé
                </span>
                <div
                    data-testid="result-item-name"
                    className="text-xl font-semibold tracking-tight text-white mt-1 truncate"
                >
                    {itemName || <span className="text-gray-600">— sans titre —</span>}
                </div>
            </div>

            {/* Breakdown */}
            <div className="bg-[#111111] border border-[#222222] p-5 mb-6">
                <div className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono mb-2">
                    Décomposition
                </div>

                <Row
                    testid="row-sale"
                    label="Prix de vente"
                    value={calc.sale}
                    sign="+"
                    color="text-white"
                />
                <Row
                    testid="row-purchase"
                    label="Prix d'achat"
                    value={calc.purchase}
                    sign="−"
                    color="text-gray-300"
                />
                <Row
                    testid="row-lbc"
                    label="Taxe Leboncoin (5%)"
                    value={calc.lbcTax}
                    sign="−"
                    color="text-orange-400"
                    accent="#F97316"
                />
                <Row
                    testid="row-delivery"
                    label="Livraison"
                    value={calc.delivery}
                    sign="−"
                    color="text-yellow-400"
                    accent="#EAB308"
                />
                <Row
                    testid="row-urssaf"
                    label="URSSAF (13%)"
                    value={calc.urssaf}
                    sign="−"
                    color="text-blue-400"
                    accent="#3B82F6"
                />
            </div>

            {/* Gross profit */}
            <div className="flex items-center justify-between mb-6 font-mono text-xs">
                <span className="tracking-[0.2em] uppercase text-gray-500">
                    Bénéfice brut
                </span>
                <span
                    data-testid="gross-profit"
                    className={`text-base ${calc.grossProfit >= 0 ? "text-gray-200" : "text-red-400"}`}
                >
                    {calc.grossProfit >= 0 ? "+" : ""}
                    {fmt(calc.grossProfit)} €
                </span>
            </div>

            {/* Net profit hero */}
            <div className="border-t border-[#333333] pt-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-mono">
                        Bénéfice Net
                    </span>
                    <StatusIcon className={`h-4 w-4 ${profitColor}`} />
                </div>

                <div
                    data-testid="net-profit"
                    className={`font-mono text-5xl md:text-6xl font-bold tracking-tighter leading-none ${profitColor}`}
                >
                    {isProfit ? "+" : ""}
                    {fmt(calc.netProfit)}
                    <span className="text-2xl ml-1 text-gray-500 font-medium">€</span>
                </div>

                {/* Margin + ROI */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                    <div
                        data-testid="margin-box"
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
                        data-testid="roi-box"
                        className="border border-[#333333] bg-[#111111] p-3"
                    >
                        <div className="text-[10px] tracking-[0.25em] uppercase text-gray-500 font-mono">
                            ROI
                        </div>
                        <div className={`font-mono text-xl font-semibold mt-1 ${profitColor}`}>
                            {calc.hasData ? `${calc.roi}%` : "—"}
                        </div>
                    </div>
                </div>

                {/* Verdict */}
                <div
                    data-testid="verdict"
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
                                ? "// Vente rentable"
                                : "// Vente non rentable"}
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
