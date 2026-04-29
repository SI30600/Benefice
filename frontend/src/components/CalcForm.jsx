import { Box, Calendar as CalendarIcon, Tag, Truck, ArrowDownToLine, ArrowUpFromLine, MapPin } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
    { value: "leboncoin", label: "Leboncoin" },
    { value: "vinted", label: "Vinted" },
    { value: "ebay", label: "eBay" },
    { value: "rakuten", label: "Rakuten" },
    { value: "amazon", label: "Amazon" },
    { value: "facebook", label: "Facebook Marketplace" },
    { value: "particulier", label: "Particulier (main à main)" },
    { value: "autre", label: "Autre" },
];

const FieldLabel = ({ children, icon: Icon }) => (
    <label className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400">
        {Icon && <Icon className="h-3 w-3" />}
        {children}
    </label>
);

const InputBox = ({ children }) => (
    <div className="relative bg-[#0d0d0d] border border-[#333333] focus-within:border-yellow-500 transition-colors duration-150">
        {children}
    </div>
);

const TravelButton = ({ option, active, onClick }) => (
    <button
        data-testid={`quick-delivery-${option.key}`}
        type="button"
        onClick={onClick}
        className={`flex flex-col items-start text-left p-3 border transition-all ${
            active
                ? "border-yellow-500 bg-yellow-500/10"
                : "border-[#333333] bg-[#0d0d0d] hover:border-yellow-500/50"
        }`}
    >
        <span className="flex items-center justify-between w-full mb-1">
            <span className={`text-[11px] tracking-wider font-mono uppercase ${active ? "text-yellow-500" : "text-gray-300"}`}>
                {option.label}
            </span>
            <span className={`text-sm font-mono font-bold ${active ? "text-yellow-500" : "text-white"}`}>
                {option.price}€
            </span>
        </span>
        <span className="text-[10px] text-gray-500 font-mono">{option.hint}</span>
    </button>
);

export default function CalcForm({ values, setValues, travelOptions = [] }) {
    const update = (key) => (e) =>
        setValues((v) => ({ ...v, [key]: e.target.value }));

    return (
        <section
            data-testid="calc-form"
            className="bg-[#111111] border border-[#262626] p-6 md:p-10 relative"
        >
            {/* corner accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-yellow-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-yellow-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-yellow-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-yellow-500" />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="text-[10px] tracking-[0.3em] uppercase text-yellow-500 font-mono">
                        // Input
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight mt-1">
                        Saisie de la vente
                    </h2>
                </div>
                <span className="font-mono text-[11px] text-gray-500">
                    [01/06]
                </span>
            </div>

            <div className="space-y-6">
                {/* Row 1: Item name + Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel icon={Box}>Nom de l'article</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="input-item-name"
                                type="text"
                                value={values.itemName}
                                onChange={update("itemName")}
                                placeholder="RTX 3070, i7-12700K..."
                                className="w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel icon={CalendarIcon}>Date</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="input-date"
                                type="date"
                                value={values.date}
                                onChange={update("date")}
                                className="w-full h-12 px-4 bg-transparent text-white text-sm font-mono focus:outline-none [color-scheme:dark]"
                            />
                        </InputBox>
                    </div>
                </div>

                {/* Row 2: Platform */}
                <div className="space-y-2">
                    <FieldLabel icon={Tag}>Plateforme de revente</FieldLabel>
                    <Select
                        value={values.platform}
                        onValueChange={(v) => setValues((s) => ({ ...s, platform: v }))}
                    >
                        <SelectTrigger
                            data-testid="select-platform"
                            className="h-12 bg-[#0d0d0d] border border-[#333333] rounded-none focus:border-yellow-500 focus:ring-0 text-white text-sm px-4"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                            className="bg-[#0d0d0d] border border-[#333333] rounded-none text-white"
                        >
                            {PLATFORMS.map((p) => (
                                <SelectItem
                                    key={p.value}
                                    value={p.value}
                                    data-testid={`platform-${p.value}`}
                                    className="text-sm focus:bg-yellow-500 focus:text-black rounded-none cursor-pointer"
                                >
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* divider */}
                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Montants €
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Row 3: Purchase price + Sale price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel icon={ArrowDownToLine}>Prix d'achat</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="input-purchase-price"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={values.purchasePrice}
                                onChange={update("purchasePrice")}
                                placeholder="0.00"
                                className="w-full h-14 px-4 pr-10 bg-transparent text-white text-2xl font-mono font-semibold focus:outline-none placeholder:text-gray-700"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base">€</span>
                        </InputBox>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel icon={ArrowUpFromLine}>Prix de vente</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="input-sale-price"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={values.salePrice}
                                onChange={update("salePrice")}
                                placeholder="0.00"
                                className="w-full h-14 px-4 pr-10 bg-transparent text-white text-2xl font-mono font-semibold focus:outline-none placeholder:text-gray-700"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base">€</span>
                        </InputBox>
                    </div>
                </div>

                {/* Row 4: Delivery — boutons cliquables (mêmes options qu'assemblage) */}
                <div className="space-y-2">
                    <FieldLabel icon={MapPin}>Livraison / Déplacement</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {travelOptions.map((t) => (
                            <TravelButton
                                key={t.key}
                                option={t}
                                active={values.deliveryZone === t.key}
                                onClick={() =>
                                    setValues((s) => ({ ...s, deliveryZone: t.key }))
                                }
                            />
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                        Choisis le mode de livraison ou la zone de déplacement.
                    </p>
                </div>

                {/* Reset button */}
                <button
                    data-testid="btn-reset"
                    onClick={() =>
                        setValues({
                            itemName: "",
                            date: new Date().toISOString().slice(0, 10),
                            platform: "leboncoin",
                            purchasePrice: "",
                            salePrice: "",
                            deliveryZone: "vauvert",
                        })
                    }
                    className="mt-2 inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500 hover:text-yellow-500 transition-colors"
                >
                    <span className="h-px w-6 bg-current" />
                    Réinitialiser
                </button>
            </div>
        </section>
    );
}
