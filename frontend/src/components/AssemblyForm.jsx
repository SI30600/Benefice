import { User, Calendar as CalendarIcon, Monitor, Laptop, ArrowDownToLine, ArrowUpFromLine, MapPin, Wrench, HardDrive } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

export default function AssemblyForm({ asm, setAsm, TRAVEL }) {
    const update = (key) => (e) => setAsm((s) => ({ ...s, [key]: e.target.value }));

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
                {/* Client + Date */}
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
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Pièces
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Parts cost + sale */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <FieldLabel icon={ArrowDownToLine}>Coût pièces (achat)</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-parts-cost"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={asm.partsCost}
                                onChange={update("partsCost")}
                                placeholder="0.00"
                                className="w-full h-14 px-4 pr-10 bg-transparent text-white text-2xl font-mono font-semibold focus:outline-none placeholder:text-gray-700"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base">€</span>
                        </InputBox>
                        <p className="text-[11px] text-gray-500 font-mono">Taxe LBC 5% appliquée</p>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel icon={ArrowUpFromLine}>Pièces facturées au client</FieldLabel>
                        <InputBox>
                            <input
                                data-testid="asm-input-parts-sale"
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={asm.partsSale}
                                onChange={update("partsSale")}
                                placeholder="0.00"
                                className="w-full h-14 px-4 pr-10 bg-transparent text-white text-2xl font-mono font-semibold focus:outline-none placeholder:text-gray-700"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-base">€</span>
                        </InputBox>
                        <p className="text-[11px] text-gray-500 font-mono">0 si client fournit ses pièces</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 py-2">
                    <div className="h-px flex-1 bg-[#262626]" />
                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-gray-600">
                        Services
                    </span>
                    <div className="h-px flex-1 bg-[#262626]" />
                </div>

                {/* Service base */}
                <button
                    data-testid="asm-service-base"
                    type="button"
                    onClick={() => setAsm((s) => ({ ...s, baseService: !s.baseService }))}
                    className={`w-full flex items-start gap-4 p-5 border text-left transition-all ${
                        asm.baseService
                            ? "border-yellow-500 bg-yellow-500/5"
                            : "border-[#333333] bg-[#0d0d0d] hover:border-yellow-500/50"
                    }`}
                >
                    <div
                        className={`mt-0.5 h-5 w-5 flex items-center justify-center shrink-0 border ${
                            asm.baseService
                                ? "bg-yellow-500 border-yellow-500"
                                : "border-[#333333]"
                        }`}
                    >
                        {asm.baseService && (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5 text-yellow-500" />
                                <span className="text-sm font-semibold text-white">
                                    Premier démarrage + Licence Windows
                                </span>
                            </div>
                            <span className="font-mono text-base font-semibold text-yellow-500">
                                +100 €
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                            Installation Windows, configuration initiale, mise en service.
                        </p>
                    </div>
                </button>

                {/* Data recovery */}
                <button
                    data-testid="asm-service-data"
                    type="button"
                    onClick={() => setAsm((s) => ({ ...s, dataRecovery: !s.dataRecovery }))}
                    className={`w-full flex items-start gap-4 p-5 border text-left transition-all ${
                        asm.dataRecovery
                            ? "border-yellow-500 bg-yellow-500/5"
                            : "border-[#333333] bg-[#0d0d0d] hover:border-yellow-500/50"
                    }`}
                >
                    <div
                        className={`mt-0.5 h-5 w-5 flex items-center justify-center shrink-0 border ${
                            asm.dataRecovery
                                ? "bg-yellow-500 border-yellow-500"
                                : "border-[#333333]"
                        }`}
                    >
                        {asm.dataRecovery && (
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <HardDrive className="h-3.5 w-3.5 text-yellow-500" />
                                <span className="text-sm font-semibold text-white">
                                    Récupération des données (ancien PC)
                                </span>
                            </div>
                            <span className="font-mono text-base font-semibold text-yellow-500">
                                +50 €
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                            Transfert des données de l'ancien ordinateur vers le nouveau.
                        </p>
                    </div>
                </button>

                {/* Travel */}
                <div className="space-y-2">
                    <FieldLabel icon={MapPin}>Zone de déplacement</FieldLabel>
                    <Select
                        value={asm.travelZone}
                        onValueChange={(v) => setAsm((s) => ({ ...s, travelZone: v }))}
                    >
                        <SelectTrigger
                            data-testid="asm-select-travel"
                            className="h-12 bg-[#0d0d0d] border border-[#333333] rounded-none focus:border-yellow-500 focus:ring-0 text-white text-sm px-4"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0d0d0d] border border-[#333333] rounded-none text-white">
                            {Object.entries(TRAVEL).map(([key, t]) => (
                                <SelectItem
                                    key={key}
                                    value={key}
                                    data-testid={`asm-travel-${key}`}
                                    className="text-sm focus:bg-yellow-500 focus:text-black rounded-none cursor-pointer"
                                >
                                    <span className="flex items-center justify-between gap-6 w-full">
                                        <span>{t.label}</span>
                                        <span className="font-mono text-xs text-gray-400">+{t.price}€</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-500 font-mono leading-relaxed">
                        Vauvert 10€ · ≤ 15 km 20€ · 15–40 km 40€ · 40–100 km 80€
                    </p>
                </div>

                {/* Reset */}
                <button
                    data-testid="asm-btn-reset"
                    onClick={() =>
                        setAsm({
                            clientName: "",
                            date: new Date().toISOString().slice(0, 10),
                            machineType: "fixe",
                            partsCost: "",
                            partsSale: "",
                            baseService: true,
                            dataRecovery: false,
                            travelZone: "vauvert",
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
