import {
    User, Calendar as CalendarIcon, Monitor, Laptop,
    MapPin, Wrench, HardDrive, Phone, Mail, Home, Cpu, MemoryStick, Plug, Box, Keyboard, Package, KeyRound, Truck,
} from "lucide-react";

const ICON_MAP = {
    Cpu, Monitor, MemoryStick, HardDrive, Plug, Box, Keyboard, Laptop,
};

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

const Toggle = ({ active, onClick, children, testid }) => (
    <button
        data-testid={testid}
        type="button"
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 h-12 px-4 text-xs tracking-[0.15em] uppercase font-mono transition-all border ${
            active
                ? "bg-yellow-500 text-black border-yellow-500"
                : "bg-[#0d0d0d] text-gray-400 border-[#333333] hover:border-yellow-500/50 hover:text-white"
        }`}
    >
        {children}
    </button>
);

const ComponentRow = ({ label, icon: Icon, value, onChange, testid }) => (
    <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3 flex items-center gap-2 min-w-0 px-1">
            {Icon && <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" />}
            <span className="text-xs text-gray-300 truncate">{label}</span>
        </div>
        <div className="col-span-3">
            <InputBox>
                <input
                    data-testid={`${testid}-name`}
                    type="text"
                    value={value.name}
                    onChange={(e) => onChange({ ...value, name: e.target.value })}
                    placeholder="Modèle"
                    className="w-full h-10 px-3 bg-transparent text-white text-xs focus:outline-none placeholder:text-gray-600"
                />
            </InputBox>
        </div>
        <div className="col-span-3">
            <InputBox>
                <input
                    data-testid={`${testid}-cost`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={value.cost}
                    onChange={(e) => onChange({ ...value, cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 pr-7 bg-transparent text-white text-sm font-mono focus:outline-none placeholder:text-gray-700"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">€</span>
            </InputBox>
        </div>
        <div className="col-span-3">
            <InputBox>
                <input
                    data-testid={`${testid}-sale`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={value.sale}
                    onChange={(e) => onChange({ ...value, sale: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-10 px-3 pr-7 bg-transparent text-yellow-500 text-sm font-mono font-semibold focus:outline-none placeholder:text-gray-700"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-xs">€</span>
            </InputBox>
        </div>
    </div>
);

const TravelButton = ({ option, active, onClick }) => (
    <button
        data-testid={`asm-travel-${option.key}`}
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

const ServiceCard = ({
    active, onToggle, testid, icon: Icon, title, description,
    amount, onAmountChange, badge, badgeColor,
}) => (
    <div
        className={`w-full border transition-all ${
            active
                ? "border-yellow-500 bg-yellow-500/5"
                : "border-[#333333] bg-[#0d0d0d]"
        }`}
    >
        <div className="flex items-start gap-4 p-5">
            <button
                data-testid={testid}
                type="button"
                onClick={onToggle}
                className={`mt-0.5 h-5 w-5 flex items-center justify-center shrink-0 border ${
                    active
                        ? "bg-yellow-500 border-yellow-500"
                        : "border-[#333333] hover:border-yellow-500/50"
                }`}
                aria-label="Activer/désactiver"
            >
                {active && (
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                )}
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-yellow-500" />
                        <span className="text-sm font-semibold text-white">
                            {title}
                        </span>
                        <span
                            className={`text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border ${badgeColor}`}
                        >
                            {badge}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1 ${active ? "" : "opacity-50"}`}>
                        <input
                            data-testid={`${testid}-amount`}
                            type="number"
                            inputMode="decimal"
                            step="1"
                            min="0"
                            value={amount}
                            onChange={onAmountChange}
                            disabled={!active}
                            className="w-16 h-8 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-500 text-base font-mono font-semibold text-right px-2 focus:outline-none disabled:cursor-not-allowed"
                        />
                        <span className="font-mono text-base font-semibold text-yellow-500">€</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    </div>
);

export default function AssemblyForm({
    asm, setAsm, travelOptions, fixeComponents, portableComponents, partsCost, partsSale,
}) {
    const update = (key) => (e) => setAsm((s) => ({ ...s, [key]: e.target.value }));
    const isFixe = asm.machineType === "fixe";
    const components = isFixe ? fixeComponents : portableComponents;
    const componentsKey = isFixe ? "componentsFixe" : "componentsPortable";

    const updateComponent = (key, val) => {
        setAsm((s) => ({
            ...s,
            [componentsKey]: { ...s[componentsKey], [key]: val },
        }));
    };

    return (
        <section
            data-testid="assembly-form"
            className="bg-[#111111] border border-[#262626] p-6 md:p-10 relative"
        >
            <div className="absolute top-0 left-0 w-3 h-3 border-l border-t border-yellow-500" />
            <div className="absolute top-0 right-0 w-3 h-3 border-r border-t border-yellow-500" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-l border-b border-yellow-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-r border-b border-yellow-500" />

            <div className="flex items-center justify-between mb-8">
                <div>
                    <span className="text-[10px] tracking-[0.3em] uppercase text-yellow-500 font-mono">
                        // Assemblage
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight mt-1">
                        Prestation client
                    </h2>
                </div>
                <span className="font-mono text-[11px] text-gray-500">[01/06]</span>
            </div>

            <div className="space-y-6">
                {/* Client */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel icon={User}>Nom du client</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-client"
                                type="text"
                                value={asm.clientName}
                                onChange={update("clientName")}
                                placeholder="Jean D., M. Martin..."
                                className="w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel icon={CalendarIcon}>Date</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-date"
                                type="date"
                                value={asm.date}
                                onChange={update("date")}
                                className="w-full h-12 px-4 bg-transparent text-white text-sm font-mono focus:outline-none [color-scheme:dark]"
                            />
                        </InputBox>
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <FieldLabel icon={Home}>Adresse</FieldLabel>
                    <InputBox>
                        <input
                            data-testid="asm-input-address"
                            type="text"
                            value={asm.clientAddress}
                            onChange={update("clientAddress")}
                            placeholder="N° + nom de rue"
                            className="w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
                        />
                    </InputBox>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <FieldLabel>Code postal</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-postal"
                                type="text"
                                value={asm.clientPostal}
                                onChange={update("clientPostal")}
                                placeholder="30600"
                                className="w-full h-12 px-4 bg-transparent text-white text-sm font-mono focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>
                    <div className="space-y-2 col-span-1 sm:col-span-2">
                        <FieldLabel>Ville</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-city"
                                type="text"
                                value={asm.clientCity}
                                onChange={update("clientCity")}
                                placeholder="Vauvert"
                                className="w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel icon={Phone}>Téléphone</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-phone"
                                type="tel"
                                value={asm.clientPhone}
                                onChange={update("clientPhone")}
                                placeholder="06 12 34 56 78"
                                className="w-full h-12 px-4 bg-transparent text-white text-sm font-mono focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel icon={Mail}>Email</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-email"
                                type="email"
                                value={asm.clientEmail}
                                onChange={update("clientEmail")}
                                placeholder="client@email.fr"
                                className="w-full h-12 px-4 bg-transparent text-white text-sm focus:outline-none placeholder:text-gray-600"
                            />
                        </InputBox>
                    </div>
                </div>

                {/* Type machine */}
                <div className="space-y-2">
                    <FieldLabel>Type de machine</FieldLabel>
                    <div className="flex gap-2">
                        <Toggle
                            testid="asm-type-fixe"
                            active={asm.machineType === "fixe"}
                            onClick={() => setAsm((s) => ({ ...s, machineType: "fixe" }))}
                        >
                            <Monitor className="h-3.5 w-3.5" />
                            PC Fixe
                        </Toggle>
                        <Toggle
                            testid="asm-type-portable"
                            active={asm.machineType === "portable"}
                            onClick={() => setAsm((s) => ({ ...s, machineType: "portable" }))}
                        >
                            <Laptop className="h-3.5 w-3.5" />
                            Portable
                        </Toggle>
                    </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600 flex items-center gap-2">
                        <Package className="h-3 w-3" />
                        Composants {isFixe ? "PC fixe" : "portable"}
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                <div className="grid grid-cols-12 gap-2 px-1 text-[10px] tracking-[0.15em] uppercase font-mono text-gray-600">
                    <div className="col-span-3">Composant</div>
                    <div className="col-span-3">Modèle</div>
                    <div className="col-span-3">Coût (achat)</div>
                    <div className="col-span-3 text-yellow-500/80">Pièces facturées</div>
                </div>

                <div className="space-y-2">
                    {components.map((c) => (
                        <ComponentRow
                            key={c.key}
                            label={c.label}
                            icon={ICON_MAP[c.icon]}
                            value={asm[componentsKey][c.key] || { name: "", cost: "", sale: "" }}
                            onChange={(val) => updateComponent(c.key, val)}
                            testid={`asm-comp-${c.key}`}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between bg-[#0d0d0d] border border-[#333333] px-4 py-3">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-gray-400">
                            Total achat
                        </span>
                        <span
                            data-testid="asm-parts-cost-total"
                            className="font-mono text-lg font-bold text-white"
                        >
                            {partsCost.toFixed(2)} €
                        </span>
                    </div>
                    <div className="flex items-center justify-between bg-[#0d0d0d] border border-yellow-500/40 px-4 py-3">
                        <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-yellow-300">
                            Total facturé
                        </span>
                        <span
                            data-testid="asm-parts-sale-total"
                            className="font-mono text-lg font-bold text-yellow-500"
                        >
                            {partsSale.toFixed(2)} €
                        </span>
                    </div>
                </div>

                {/* Livraison achat Leboncoin */}
                <div className="bg-[#0d0d0d] border border-[#333333] px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                        <Truck className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-[11px] tracking-[0.15em] uppercase font-mono text-gray-300">
                                Livraison achat (Leboncoin)
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono truncate">
                                Charge — frais d'envoi des pièces achetées
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <input
                            data-testid="asm-input-parts-shipping"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            value={asm.partsShipping}
                            onChange={update("partsShipping")}
                            placeholder="10.00"
                            className="w-24 h-10 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-orange-400 text-base font-mono font-semibold text-right px-2 focus:outline-none"
                        />
                        <span className="font-mono text-base font-semibold text-orange-400">€</span>
                    </div>
                </div>

                <p className="text-[11px] text-gray-500 font-mono">
                    Pièces facturées (article — URSSAF 13%). Mets le même montant que le coût si tu refactures sans marge, ou 0 si client fournit ses pièces.
                </p>

                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Articles & prestations
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Licence Windows — ARTICLE 13% */}
                <ServiceCard
                    testid="asm-license"
                    active={asm.licenseWindows}
                    onToggle={() => setAsm((s) => ({ ...s, licenseWindows: !s.licenseWindows }))}
                    icon={KeyRound}
                    title="Licence Windows"
                    description="Vente de la licence Windows (article — URSSAF 13%)."
                    amount={asm.amountLicense}
                    onAmountChange={update("amountLicense")}
                    badge="ART · 13%"
                    badgeColor="border-orange-500/50 text-orange-400"
                />

                {/* Premier démarrage — radio entre 2 variantes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        {
                            key: "withData",
                            title: "Avec récup. données",
                            desc: "Démarrage + récupération des données ancien PC.",
                            amountField: "amountWithData",
                        },
                        {
                            key: "withoutData",
                            title: "Sans récup. données",
                            desc: "Premier démarrage seul (sans transfert de données).",
                            amountField: "amountWithoutData",
                        },
                    ].map((opt) => {
                        const active = asm.serviceVariant === opt.key;
                        return (
                            <div
                                key={opt.key}
                                className={`border transition-all ${
                                    active
                                        ? "border-yellow-500 bg-yellow-500/5"
                                        : "border-[#333333] bg-[#0d0d0d]"
                                }`}
                            >
                                <div className="p-4">
                                    <button
                                        data-testid={`asm-service-${opt.key}`}
                                        type="button"
                                        onClick={() =>
                                            setAsm((s) => ({
                                                ...s,
                                                serviceVariant: active ? "none" : opt.key,
                                            }))
                                        }
                                        className="flex items-center gap-3 w-full text-left"
                                    >
                                        <span
                                            className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                active
                                                    ? "border-yellow-500"
                                                    : "border-[#444444]"
                                            }`}
                                        >
                                            {active && (
                                                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                            )}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Wrench className="h-3.5 w-3.5 text-yellow-500" />
                                                <span className="text-sm font-semibold text-white">
                                                    {opt.title}
                                                </span>
                                                <span className="text-[9px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 border border-blue-500/50 text-blue-400">
                                                    PREST · 23%
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                    <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                                        {opt.desc}
                                    </p>
                                    <div className="mt-3 flex items-center justify-end gap-1">
                                        <input
                                            data-testid={`asm-service-${opt.key}-amount`}
                                            type="number"
                                            inputMode="decimal"
                                            step="1"
                                            min="0"
                                            value={asm[opt.amountField]}
                                            onChange={update(opt.amountField)}
                                            disabled={!active}
                                            className="w-20 h-9 bg-[#0d0d0d] border border-[#333333] focus:border-yellow-500 text-yellow-500 text-base font-mono font-semibold text-right px-2 focus:outline-none disabled:opacity-50"
                                        />
                                        <span className="font-mono text-base font-semibold text-yellow-500">
                                            €
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <button
                    data-testid="asm-service-none"
                    type="button"
                    onClick={() => setAsm((s) => ({ ...s, serviceVariant: "none" }))}
                    className={`text-[10px] tracking-[0.25em] uppercase font-mono transition-colors ${
                        asm.serviceVariant === "none"
                            ? "text-yellow-500"
                            : "text-gray-500 hover:text-yellow-500"
                    }`}
                >
                    {asm.serviceVariant === "none" ? "✓ aucune prestation" : "désélectionner"}
                </button>

                {/* Travel */}
                <div className="space-y-2 pt-2">
                    <FieldLabel icon={MapPin}>Déplacement / Livraison</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {travelOptions.map((t) => (
                            <TravelButton
                                key={t.key}
                                option={t}
                                active={asm.travelZone === t.key}
                                onClick={() => setAsm((s) => ({ ...s, travelZone: t.key }))}
                            />
                        ))}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                        Le déplacement / livraison est compté comme prestation (URSSAF 23%).
                    </p>
                </div>

                <button
                    data-testid="asm-btn-reset"
                    onClick={() => {
                        const blank = (list) =>
                            Object.fromEntries(list.map((c) => [c.key, { name: "", cost: "", sale: "" }]));
                        setAsm({
                            clientName: "",
                            clientAddress: "",
                            clientPostal: "",
                            clientCity: "",
                            clientPhone: "",
                            clientEmail: "",
                            date: new Date().toISOString().slice(0, 10),
                            machineType: "fixe",
                            componentsFixe: blank(fixeComponents),
                            componentsPortable: blank(portableComponents),
                            licenseWindows: true,
                            amountLicense: "100",
                            serviceVariant: "withData",
                            amountWithData: "60",
                            amountWithoutData: "40",
                            travelZone: "vauvert",
                            partsShipping: "10",
                        });
                    }}
                    className="mt-2 inline-flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase font-mono text-gray-500 hover:text-yellow-500 transition-colors"
                >
                    <span className="h-px w-6 bg-current" />
                    Réinitialiser
                </button>
            </div>
        </section>
    );
}
