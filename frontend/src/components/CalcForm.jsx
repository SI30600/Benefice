import { Box, Calendar as CalendarIcon, Tag, Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, MapPin } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const PLATFORMS = [
    { value: "leboncoin", label: "Leboncoin (taxe 5%)" },
    { value: "vinted", label: "Vinted" },
    { value: "ebay", label: "eBay" },
    { value: "rakuten", label: "Rakuten" },
    { value: "amazon", label: "Amazon" },
    { value: "facebook", label: "Facebook Marketplace" },
    { value: "particulier", label: "Particulier (main à main)" },
    { value: "magasin", label: "Magasin (Boulanger, Cdiscount…)" },
    { value: "autre", label: "Autre" },
];

const FieldLabel = ({ children, icon: Icon }) => (
    <label className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.2em] uppercase text-gray-400">
        {Icon && <Icon className="h-3 w-3" />}
        {children}
    </label>
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

// Taux URSSAF + impôt + CFP pour articles (vente de marchandise)
const ARTICLE_RATE = 0.135; // 12.3% URSSAF + 1% impôt + 0.2% CFP

// Seuil minimum de revente pour ne pas perdre d'argent sur cet article
// Sale × (1 - RATE) >= achat + taxeLBC  =>  Sale >= (achat + taxeLBC) / (1 - RATE)
const computeMinSale = (purchasePrice, platform) => {
    const purchase = parseFloat(purchasePrice) || 0;
    if (purchase <= 0) return 0;
    const lbcTax = platform === "leboncoin" ? purchase * 0.05 : 0;
    return Math.ceil(((purchase + lbcTax) / (1 - ARTICLE_RATE)) * 100) / 100;
};

const ItemRow = ({ item, index, total, onChange, onRemove }) => {
    const update = (key) => (e) => onChange(index, { ...item, [key]: e.target.value });
    const isOther = item.platform === "autre";
    const purchase = parseFloat(item.purchasePrice) || 0;
    // Pour le seuil min : Leboncoin = 5% auto, "autre" = taxe manuelle saisie, sinon 0
    let extraCosts = 0;
    if (item.platform === "leboncoin") extraCosts = purchase * 0.05;
    else if (isOther) {
        extraCosts = (parseFloat(item.customTax) || 0) + (parseFloat(item.customShipping) || 0);
    }
    const minSale = purchase > 0
        ? Math.ceil(((purchase + extraCosts) / (1 - ARTICLE_RATE)) * 100) / 100
        : 0;
    return (
        <div
            data-testid={`quick-item-${index}`}
            className="border border-[#262626] bg-[#0a0a0a] p-3 space-y-3 relative"
        >
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] tracking-[0.25em] uppercase font-mono text-yellow-500">
                    Article #{index + 1}
                </span>
                {total > 1 && (
                    <button
                        type="button"
                        data-testid={`quick-item-remove-${index}`}
                        onClick={() => onRemove(index)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                        aria-label="Supprimer cet article"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Nom + plateforme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                    data-testid={`quick-item-name-${index}`}
                    type="text"
                    value={item.itemName}
                    onChange={update("itemName")}
                    placeholder="Nom de l'article"
                    className="h-10 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm focus:outline-none"
                />
                <Select
                    value={item.platform}
                    onValueChange={(v) => onChange(index, { ...item, platform: v })}
                >
                    <SelectTrigger
                        data-testid={`quick-item-platform-${index}`}
                        className="h-10 bg-[#0d0d0d] border border-[#333333] rounded-none focus:border-yellow-500 focus:ring-0 text-white text-sm px-3"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0d0d0d] border border-[#333333] rounded-none text-white">
                        {PLATFORMS.map((p) => (
                            <SelectItem
                                key={p.value}
                                value={p.value}
                                className="text-sm focus:bg-yellow-500 focus:text-black rounded-none cursor-pointer"
                            >
                                {p.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Achat + vente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                    <input
                        data-testid={`quick-item-purchase-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={item.purchasePrice}
                        onChange={update("purchasePrice")}
                        placeholder="Prix achat"
                        className="w-full h-11 px-3 pr-10 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-red-300 text-base font-mono font-semibold focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">€</span>
                </div>
                <div className="relative">
                    <input
                        data-testid={`quick-item-sale-${index}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={item.salePrice}
                        onChange={update("salePrice")}
                        placeholder={minSale > 0 ? `min ${minSale} €` : "Prix vente"}
                        className="w-full h-11 px-3 pr-10 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-green-400 text-base font-mono font-semibold focus:outline-none placeholder:text-yellow-500/40 placeholder:italic"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">€</span>
                </div>
            </div>
            {minSale > 0 && (
                <div className="text-[10px] font-mono text-gray-500 -mt-1">
                    {(parseFloat(item.salePrice) || 0) >= minSale ? (
                        <span className="text-green-400">
                            ✓ rentable — seuil minimum {minSale} € (couvre achat + taxe + URSSAF 13,5%)
                        </span>
                    ) : (
                        <span className="text-yellow-500/80">
                            ⚠ seuil minimum {minSale} € pour couvrir achat + taxe + URSSAF 13,5%
                        </span>
                    )}
                </div>
            )}

            {/* Champs custom si plateforme = "Autre" */}
            {isOther && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1f1f1f]">
                    <div>
                        <label className="text-[9px] tracking-[0.2em] uppercase font-mono text-gray-500 mb-1 block">
                            Taxe / commission (€)
                        </label>
                        <div className="relative">
                            <input
                                data-testid={`quick-item-customtax-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.customTax || ""}
                                onChange={update("customTax")}
                                placeholder="0.00"
                                className="w-full h-10 px-3 pr-8 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-red-300 text-sm font-mono focus:outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">€</span>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] tracking-[0.2em] uppercase font-mono text-gray-500 mb-1 block">
                            Frais livraison / expédition (€)
                        </label>
                        <div className="relative">
                            <input
                                data-testid={`quick-item-customship-${index}`}
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.customShipping || ""}
                                onChange={update("customShipping")}
                                placeholder="0.00"
                                className="w-full h-10 px-3 pr-8 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-red-300 text-sm font-mono focus:outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">€</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function CalcForm({ values, setValues, travelOptions = [] }) {
    const blankItem = () => ({
        id: Math.random().toString(36).slice(2, 10),
        itemName: "",
        platform: "leboncoin",
        purchasePrice: "",
        salePrice: "",
        customTax: "",
        customShipping: "",
    });

    const updateItem = (index, newItem) => {
        setValues((v) => {
            const items = [...(v.items || [])];
            items[index] = newItem;
            return { ...v, items };
        });
    };

    const addItem = () => {
        setValues((v) => ({ ...v, items: [...(v.items || []), blankItem()] }));
    };

    const removeItem = (index) => {
        setValues((v) => {
            const items = (v.items || []).filter((_, i) => i !== index);
            return { ...v, items: items.length ? items : [blankItem()] };
        });
    };

    return (
        <section
            data-testid="calc-form"
            className="bg-[#111111] border border-[#262626] p-6 md:p-10 relative"
        >
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
                    {(values.items || []).length} article{(values.items || []).length > 1 ? "s" : ""}
                </span>
            </div>

            <div className="space-y-6">
                {/* Date */}
                <div className="space-y-2">
                    <FieldLabel icon={CalendarIcon}>Date</FieldLabel>
                    <input
                        data-testid="input-date"
                        type="date"
                        value={values.date}
                        onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))}
                        className="w-full sm:w-1/2 h-11 px-3 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-white text-sm font-mono focus:outline-none [color-scheme:dark]"
                    />
                </div>

                {/* divider */}
                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Articles
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Items list */}
                <div className="space-y-3">
                    {(values.items || []).map((item, idx) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            index={idx}
                            total={(values.items || []).length}
                            onChange={updateItem}
                            onRemove={removeItem}
                        />
                    ))}
                    <button
                        type="button"
                        data-testid="quick-add-item"
                        onClick={addItem}
                        className="w-full h-10 border border-dashed border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 text-[11px] tracking-[0.2em] uppercase font-mono font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Ajouter un article
                    </button>
                </div>

                {/* divider */}
                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Livraison
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Delivery zones */}
                <div className="space-y-2">
                    <FieldLabel icon={MapPin}>Livraison / Déplacement</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {travelOptions.map((t) => (
                            <TravelButton
                                key={t.key}
                                option={t}
                                active={values.deliveryZone === t.key}
                                onClick={() => setValues((s) => ({ ...s, deliveryZone: t.key }))}
                            />
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                        Choisis le mode de livraison ou la zone de déplacement (compté une fois pour toute la commande).
                    </p>
                </div>

                {/* Reset */}
                <button
                    data-testid="btn-reset"
                    onClick={() =>
                        setValues({
                            date: new Date().toISOString().slice(0, 10),
                            items: [blankItem()],
                            deliveryZone: "vauvert",
                        })                    }
                    className="mt-2 inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500 hover:text-yellow-500 transition-colors"
                >
                    <span className="h-px w-6 bg-current" />
                    Réinitialiser
                </button>
            </div>
        </section>
    );
}
