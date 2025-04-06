import { Goods, Item, Repository } from "./repository.js";

export type MachineCoefficient = number | ((tier:number, choice:number) => number);

type Machine = {
    perfectOverclock: boolean;
    choice?: Goods[];
    speed: MachineCoefficient;
    power: MachineCoefficient;
    parallels: MachineCoefficient;
    info?: string;
}

type MachineList = {
    [key: string]: Machine;
}

export const machines: MachineList = {};

const COIL_TIERS = 14;
const coils:Goods[] = new Array(COIL_TIERS);

for (var i=0; i<COIL_TIERS; i++) {
    coils[i] = Repository.current.GetById<Item>(`i:gregtech:gt.blockcasings5:${i}`)!;
}

export const defaultMachine:Machine = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Electric Blast Furnace"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => { // TODO: special formula
        return 1;
    },
    power: (tier: number, choice: number) => { // TODO: special formula
        return 1;
    },
    parallels: 1,
    info: "EBF speed and power formulas not implemented",
};

machines["Multi Smelter"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => { // TODO: increases with coil tier
        return 1;
    },
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 8-8192 (increases with coil tier)
        return 8;
    },
    info: "MS speed and power formulas not implemented",
};

machines["Dimensionally Transcendent Plasma Forge"] = {
    perfectOverclock: true, // TODO: Perfect Overclocks when Convergence is active (increased catalyst cost)
    choice: coils,
    speed: 1, // TODO: Perfect Overclocks when Convergence is active (increased catalyst cost)
    power: (tier: number, choice: number) => { // TODO: up to 50% after 8 hours continuous run time
        return 1;
    },
    parallels: 1,
    info: "Assumes no machine-specific speed/power bonuses",
};

machines["Pyrolyse Oven"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => 0.5 + 0.5 * choice,
    power: 1,
    parallels: 1,
    info: "Assumes no machine-specific speed/power bonuses",
};

machines["Large Chemical Reactor"] = {
    perfectOverclock: true,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Bacterial Vat"] = {
    perfectOverclock: false,
    speed: 1,
    power: (tier: number, choice: number) => { // TODO: maximum efficiency boost keep the Output Hatch always half filled!
        return 1;
    },
    parallels: 1,
    info: "Assumes maximum efficiency boost",
};

machines["Mega Blast Furnace"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: 256,
    info: "MBF speed and power formulas not implemented",
};

machines["Mega Vacuum Freezer"] = {
    perfectOverclock: true, // TODO: Perfect overclocks with Subspace Cooling
    speed: 1, // TODO: Perfect overclocks with Subspace Cooling
    power: (tier: number, choice: number) => { // TODO: increases with coolant type and amount (Subspace Cooling)
        return 1;
    },
    parallels: 256,
    info: "Assumes perfect overclocks with Subspace Cooling. Does not account for coolant type and amount.",
};

machines["Electric Implosion Compressor"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => Math.pow(4, tier - 1),
};

machines["Circuit Assembly Line"] = {
    perfectOverclock: true,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Mega Distillation Tower"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: 256,
};

machines["Mega Chemical Reactor"] = {
    perfectOverclock: true,
    speed: 1,
    power: 1,
    parallels: 256,
};

machines["Helioflare Power Forge"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Naquadah Fuel Refinery"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => { // TODO: unlock more fuel types with higher tier coils
        return 1;
    },
    power: (tier: number, choice: number) => { // TODO: reduce processing times with higher tier coils
        return 1;
    },
    parallels: 1,
    info: "Coils are not implemented",
};

machines["Large Fluid Extractor"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => 0.5 * Math.pow(1.1, choice),
    power: (tier: number, choice: number) => Math.pow(0.9, choice),
    parallels: 16, // TODO: 8 * solenoid tier (MV is tier 2)
    info: "Solenoid tier is not implemented (16 parallels)",
};

machines["Hyper-Intensity Laser Engraver"] = {
    perfectOverclock: false,
    speed: 3, // 200% faster
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: cube root of laser source amperage input
        return 1;
    },
    info:"Laser source amperage input is not implemented",
};

machines["Dissection Apparatus"] = {
    perfectOverclock: false,
    speed: 3, // 200% faster
    power: 1,
    parallels: (tier: number, choice: number) => 8 * tier, // TODO: 8 per tier of Item Pipe Casing
    info: "Item Pipe Casing tier is not implemented",
};

machines["Big Barrel Brewery"] = {
    perfectOverclock: false,
    speed: 1.5, // 50% faster
    power: 1,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Dangote Distillus"] = {
    perfectOverclock: false,
    speed: (tier: number, choice: number) => { // TODO: 250% faster in DT mode  100% faster in distillery mode
        return 1;
    },
    power: (tier: number, choice: number) => { // TODO: 85% less energy in distillery mode
        return 1;
    },
    parallels: (tier: number, choice: number) => { // TODO: DTower Mode: T1=4  T2=12; Distillery Mode: Tower Tier * (4*InputTier)
        return 4;
    },
    info: "DT mode is not implemented, assumes tier 1",
};

machines["Zyngen"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => 1 + 0.05 * choice,
    power: 1,
    parallels: (tier: number, choice: number) => tier * choice,
};

machines["Elemental Duplicator"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => 8 * tier,
};

machines["Boldarnator"] = {
    perfectOverclock: false,
    speed: 2,
    power: 1,
    parallels: (tier: number, choice: number) => tier * 8,
};

machines["Industrial Sledgehammer"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => tier * 8, // TODO: Tier x Anvil Tier x 8
    info: "Anvil tier is not implemented",
};

machines["Thermic Heating Device"] = {
    perfectOverclock: false,
    speed: 2.2, // 120% faster
    power: 1,
    parallels: (tier: number, choice: number) => 8 * tier,
};

machines["Quantum Force Transformer"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 1 + number of catalysts
        return 1;
    },
    info: "Catalysts are not implemented",
};

machines["Neutron Activator"] = {
    perfectOverclock: false,
    speed: 1,
    power: (tier: number, choice: number) => { // TODO: time discount per extra Speeding Pipe Casing (reduces Neutron Accelerator efficiency)
        return 1;
    },
    parallels: 1,
    info: "Speeding Pipe Casing is not implemented",
};

machines["Precise Auto-Assembler MT-3662"] = {
    perfectOverclock: false,
    speed: 2, // 100% faster in Normal Mode
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: Imprecise (MK-0) = 16x MK-I = 32x MK-II = 64x MK-III = 128x MK-IV = 256x (in Normal Mode based on Precise Electronic Unit Casing)
        return 16;
    },
    info: "Precise Electronic Unit Casing tier is not implemented",
};

machines["Compact Fusion Computer MK-I Prototype"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: 64,
};

machines["Compact Fusion Computer MK-II"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 128x if Startup < 160 000 000 EU 64x if Startup >= 160 000 000 EU
        return 64;
    },
    info: "Startup energy is not implemented",
};

machines["Compact Fusion Computer MK-III"] = {
    perfectOverclock: false,
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 192x if Startup < 160 000 000 EU 128x if Startup < 320 000 000 EU 64x if Startup >= 320 000 000 EU
        return 64;
    },
    info: "Startup energy is not implemented",
};

machines["Compact Fusion Computer MK-IV Prototype"] = {
    perfectOverclock: true, // Performs 4/4 overclock
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 256x if Startup < 160 000 000 EU 192x if Startup < 320 000 000 EU 128x if Startup < 640 000 000 EU 64x if Startup >= 640 000 000 EU
        return 64;
    },
    info: "Startup energy is not implemented",
};

machines["Compact Fusion Computer MK-V"] = {
    perfectOverclock: true, // Performs 4/4 overclock
    speed: 1,
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: 320x if Startup < 160 000 000 EU 256x if Startup < 320 000 000 EU 192x if Startup < 640 000 000 EU 128x if Startup < 1 200 000 000 EU 64x if Startup >= 1 200 000 000 EU
        return 64;
    },
    info: "Startup energy is not implemented",
};

machines["Magnetic Flux Exhibitor"] = {
    perfectOverclock: false,
    speed: (tier: number, choice: number) => { // TODO: bonuses depend on electromagnet
        return 1;
    },
    power: (tier: number, choice: number) => { // TODO: bonuses depend on electromagnet
        return 1;
    },
    parallels: 1,
    info: "Electromagnet tier is not implemented",
};

machines["TurboCan Pro"] = {
    perfectOverclock: false,
    speed: 2, // 100% faster
    power: 1,
    parallels: (tier: number, choice: number) => 8 * tier,
};

machines["Fluid Shaper"] = {
    perfectOverclock: false,
    speed: 3, // TODO: up to 200% faster
    power: 1,
    parallels: (tier: number, choice: number) => 2 * tier + 3 * tier * 0, // Assuming no width expansion by default
    info: "Width expansion is not implemented. Assumes maximum speed",
};

machines["Industrial Precision Lathe"] = {
    perfectOverclock: false,
    speed: (tier: number, choice: number) => { // TODO: increases based on item pipe casing speed and voltage
        return 1;
    },
    power: 0.8,
    parallels: (tier: number, choice: number) => tier + (tier * 2), // TODO: Item Pipe Casing Parallel + (Voltage Tier * 2) - Assuming Item Pipe Casing Parallel is the same as Voltage Tier for now
    info: "Item Pipe Casing tier is not implemented",
};

machines["Industrial Autoclave"] = {
    perfectOverclock: false,
    choice: coils,
    speed: (tier: number, choice: number) => 1 + 0.25 * choice,
    power: (tier: number, choice: number) => { // TODO: Energy consumption reduced with higher fluid pipe tiers
        return 1;
    },
    parallels: (tier: number, choice: number) => 12 * tier, // TODO: 12 per Item Pipe Casing Tier - Assuming Item Pipe Casing Tier is the same as Voltage Tier for now
    info: "Fluid pipe tier and item pipe casing tier are not implemented",
};

machines["Nuclear Salt Processing Plant"] = {
    perfectOverclock: false,
    speed: 2.5, // 150% faster
    power: 1,
    parallels: (tier: number, choice: number) => 2 * tier,
};

machines["Industrial Centrifuge"] = {
    perfectOverclock: false,
    speed: 2.25, // 125% faster
    power: 0.9,
    parallels: (tier: number, choice: number) => 6 * tier,
};

machines["Industrial Coke Oven"] = {
    perfectOverclock: false,
    speed: 1,
    power: (tier: number, choice: number) => 1 - 0.04 * tier,
    parallels: (tier: number, choice: number) => { // TODO: 12 with Heat Resistant Casings 24 with Heat Proof Casings - Assuming a fixed tier for these casings
        return 12;
    },
};

machines["Industrial Material Press"] = {
    perfectOverclock: false,
    speed: 6, // 500% faster
    power: 1,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Industrial Electrolyzer"] = {
    perfectOverclock: false,
    speed: 2.8, // 180% faster
    power: 0.9,
    parallels: (tier: number, choice: number) => 2 * tier,
};

machines["Industrial Maceration Stack"] = {
    perfectOverclock: false,
    speed: 1.6, // 60% faster
    power: 1,
    parallels: (tier: number, choice: number) => 2 * tier, // TODO: up to n*tier (n=2 initially n=8 with Maceration Upgrade Chip)
    info: "Maceration Upgrade Chip is not implemented",
};

machines["Industrial Wire Factory"] = {
    perfectOverclock: false,
    speed: 3, // 200% faster
    power: 0.75,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Matter Fabrication CPU"] = {
    perfectOverclock: false,
    speed: 1, // +0%
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: Scrap = 64  UU = 8 * Tier
        return 8 * tier;
    },
};

machines["Industrial Mixing Machine"] = {
    perfectOverclock: false,
    speed: 3.5, // 250% faster
    power: 1,
    parallels: (tier: number, choice: number) => 8 * tier,
};

machines["Large Sifter Control Block"] = {
    perfectOverclock: false,
    speed: 5, // 400% faster
    power: 0.75,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Large Thermal Refinery"] = {
    perfectOverclock: false,
    speed: 2.5, // 150% faster
    power: 0.8,
    parallels: (tier: number, choice: number) => 8 * tier,
};

machines["Ore Washing Plant"] = {
    perfectOverclock: false,
    speed: 5, // 400% faster
    power: 1,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Industrial Extrusion Machine"] = {
    perfectOverclock: false,
    speed: 3.5, // 250% faster
    power: 1,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["High Current Industrial Arc Furnace"] = {
    perfectOverclock: false,
    speed: 3.5, // 250% faster
    power: 1,
    parallels: (tier: number, choice: number) => { // TODO: voltage tier * W (Electric mode)  8 * voltage tier * W (Plasma mode) - Assuming W is 1 for now
        return tier;
    },
    info:"Assuming electric mode and W=1",
};

machines["Solar Tower"] = {
    perfectOverclock: false,
    speed: 1,
    power: (tier: number, choice: number) => { // TODO: increases with heat and number of reflectors
        return 1;
    },
    parallels: 1,
    info: "Reflectors are not implemented",
};

machines["Large Scale Auto-Assembler v1.01"] = {
    perfectOverclock: false,
    speed: 3, // 200% faster
    power: 1,
    parallels: (tier: number, choice: number) => 2 * tier,
};

machines["Cryogenic Freezer"] = {
    perfectOverclock: false,
    speed: 2, // +100%
    power: 1,
    parallels: 4,
};

machines["Amazon Warehousing Depot"] = {
    perfectOverclock: false,
    speed: 6, // 500% faster
    power: 0.75,
    parallels: (tier: number, choice: number) => 16 * tier,
};

machines["Volcanus"] = {
    perfectOverclock: false,
    speed: 2.2, // +120%
    power: 0.9,
    parallels: 8,
};

machines["Density^2"] = {
    perfectOverclock: false,
    speed: 2, // +100%
    power: 1,
    parallels: (tier: number, choice: number) => Math.floor((tier / 2) + 1),
};

machines["FusionTech MK IV"] = {
    perfectOverclock: true, // Performs 4/4 overclocks
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["FusionTech MK V"] = {
    perfectOverclock: true, // Performs 4/4 overclocks
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Industrial Cutting Factory"] = {
    perfectOverclock: false,
    speed: 3, // 200% faster
    power: 0.75,
    parallels: (tier: number, choice: number) => 4 * tier,
};

machines["Utupu-Tanuri"] = {
    perfectOverclock: false,
    speed: (tier: number, choice: number) => { // TODO: +120% (upgraded overclocks reduce recipe time to 25%)
        return 2.2;
    },
    power: (tier: number, choice: number) => { // TODO: 5% speedup per 900K over min. Heat Capacity (multiplicative)
        return 1;
    },
    parallels: 4,
    info: "Heat Capacity and upgraded overclocks are not implemented",
};

machines["ExxonMobil Chemical Plant"] = {
    perfectOverclock: false,
    speed: 1,
    power: (tier: number, choice: number) => { // TODO: +20% chance of not damaging catalyst per pipe casing tier
        return 1;
    },
    parallels: (tier: number, choice: number) => 2 * tier, // TODO: +2 per pipe casing tier - Assuming pipe casing tier is the same as voltage tier
    info: "Pipe casing tier is not implemented",
};