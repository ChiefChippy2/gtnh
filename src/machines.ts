import { RecipeModel } from "./page.js";
import { Goods, Item, Repository } from "./repository.js";
import { TIER_UEV } from "./utils.js";

export type MachineCoefficient = number | ((recipe:RecipeModel, choices:{[key:string]:number}) => number);

function getCoilChoices():string[] {
    const COIL_TIERS = 14;
    const coils:string[] = [];
    for (var i=0; i<COIL_TIERS; i++) {
        coils[i] = Repository.current.GetById<Item>(`i:gregtech:gt.blockcasings5:${i}`)!.name;
    }
    return coils;
}

type Machine = {
    choices?: {[key:string]:Choice};
    perfectOverclock: MachineCoefficient;
    speed: MachineCoefficient;
    power: MachineCoefficient;
    parallels: MachineCoefficient;
    info?: string;
}

type Choice = {
    description: string;
    tooltip?: string;
    choices?: string[];
    default?: number;
    min?: number;
    max?: number;
}

let CoilTierChoice:Choice = {
    description: "Coils",
    choices: getCoilChoices(),
}

type MachineList = {
    [key: string]: Machine;
}

export const machines: MachineList = {};

export const singleBlockMachine:Machine = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

export const defaultMachine:Machine = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
    info: "This machine is not in the database, assuming default values",
};

machines["Large Electric Compressor"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 0.9,
    parallels: (recipe) => recipe.voltageTier * 2,
};

machines["Hot Isostatic Pressurization Unit"] = {
    perfectOverclock: 0,
    // TODO: 250% faster/slower than singleblock machines of the same voltage
    speed: 2.5,
    // TODO: 75%/110%
    power: 0.75,
    // TODO: 4/1 per voltage tier
    parallels: (recipe) => recipe.voltageTier * 4,
    info: "Assumes it is not overheated"
};

machines["Pseudostable Black Hole Containment Field"] = {
    perfectOverclock: 0,
    speed: 5,
    power: 0.7,
    parallels: (recipe, choices) => {
        // TODO: 2x/4x when stability is BELOW 50/20
        return recipe.voltageTier * 8;
    },
    info: "Parallels depend on stability, which is not represented.",
};

machines["Bacterial Vat"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
    info: "Speed depends on the fill level of the Output Hatch.",
};

machines["Circuit Assembly Line"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Component Assembly Line"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 1,
    power: 1,
    parallels: 1
};

machines["Extreme Heat Exchanger"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Naquadah Fuel Refinery"] = {
    perfectOverclock: (recipe, choices) => recipe.voltageTier - TIER_UEV + choices.coils,
    speed: 1,
    power: 1,
    parallels: 1,
    choices: {"coils": {
        description: "Coils",
        choices: ["T1 Field Restriction Coil", "T2 Advanced Field Restriction Coil", "T3 Ultimate Field Restriction Coil", "T4 Temporal Field Restriction Coil"],
    }},
    info: "Speed depends on the tier of coils used.",
};

// HERE

machines["Neutron Activator"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => Math.pow((1/0.9), (choices.speedingPipeCasing - 4)),
    power: 0,
    parallels: 1,
    choices: {"speedingPipeCasing": {
        description: "Speeding Pipe Casing",
        min: 4,
    }},
    info: "Power calculation is not implemented.",
};

machines["Precise Auto-Assembler MT-3662"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => {
        let precise = recipe.recipe && recipe.recipe.recipeType.name == "Precise Assembler";
        return precise ? 1 : 2;
    },
    power: 1,
    parallels: (recipe, choices) => {
        return Math.pow(2, (choices.precisionTier - 1) * 16);
    },
    choices: {"precisionTier": {
        description: "Precision Tier",
        choices: ["Imprecise (MK-0)", "MK-I", "MK-II", "MK-III", "MK-IV"],
    }},
};

machines["Fluid Shaper"] = {
    perfectOverclock: 0,
    speed: (recipe) => {
        // TODO: Implement speed decay calculation
        return 3; // Placeholder (up to 300% = 3)
    },
    power: 0.8,
    parallels: (recipe, choices) => recipe.voltageTier * 2 + recipe.voltageTier * 3 * (choices.widthExpansion || 0), // Assuming choices[0] is width expansion
    choices: ["widthExpansion"],
    info: "Speed decays over time. Parallels depend on voltage tier and width expansion.",
};

machines["Zyngen"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => 1 + (choices[0] || 0) * 0.05, // Assuming choices[0] is coil tier
    power: 1,
    parallels: (recipe, choices) => recipe.voltageTier * (choices[0] || 1), // Assuming choices[0] is coil tier, default to 1 if no choice
    choices: ["coilTier"],
};

machines["High Current Industrial Arc Furnace"] = {
    perfectOverclock: 0,
    speed: 3.5,
    power: 1,
    parallels: (recipe, choices) => {
        const mode = choices[0] || "Electric"; // Default to Electric
        return mode === "Plasma" ? recipe.voltageTier * 8 * (choices[1] || 1) : recipe.voltageTier * (choices[1] || 1); // Assuming choices[1] is W
    },
    choices: ["mode", "W"],
};

machines["Large Scale Auto-Assembler v1.01"] = {
    perfectOverclock: 0,
    speed: 3,
    power: 1,
    parallels: (recipe) => recipe.voltageTier * 2,
};

machines["Industrial Autoclave"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => 1 + (choices[0] || 0) * 0.25, // Assuming choices[0] is coil level (125% faster = 1 + 0.25 per level)
    power: (recipe, choices) => recipe.consumption * (12 - (choices[1] || 0)) / 12, // Assuming choices[1] is Pipe Casing Tier
    parallels: (recipe, choices) => (choices[1] || 0) * 12, // Assuming choices[1] is Item Pipe Casing Tier
    choices: ["coilLevel", "pipeCasingTier"],
    info: "Power consumption depends on Pipe Casing Tier. Parallels depend on Item Pipe Casing Tier.",
};

machines["Electric Blast Furnace"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 2,
    power: (recipe) => {
        // TODO: Implement power reduction based on temperature
        return 1; // Placeholder
    },
    parallels: 1,
    info: "Speed can become 4 with perfect overclock. Power consumption reduces with higher temperature.",
};

machines["Volcanus"] = {
    perfectOverclock: 0,
    speed: 2.2,
    power: 0.9,
    parallels: 8,
};

machines["Mega Blast Furnace"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 2,
    power: (recipe) => {
        // TODO: Implement power reduction based on temperature
        return 1; // Placeholder
    },
    parallels: 256,
    info: "Speed can become 4 with perfect overclock. Power consumption reduces with higher temperature.",
};

machines["Big Barrel Brewery"] = {
    perfectOverclock: 0,
    speed: 1.5,
    power: 1,
    parallels: (recipe) => recipe.voltageTier * 4,
};

machines["TurboCan Pro"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 1,
    parallels: (recipe) => recipe.voltageTier * 8,
};

machines["Ore Washing Plant"] = {
    perfectOverclock: 0,
    speed: 5,
    power: 1,
    parallels: (recipe) => recipe.voltageTier * 4,
};

machines["Oil Cracking Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: (recipe, choices) => 1 - Math.min(0.5, (choices[0] || 0) * 0.1), // Assuming choices[0] is coil tier
    parallels: 1,
    choices: ["coilTier"],
    info: "Power consumption reduces with higher coil tiers.",
};

machines["Mega Oil Cracker"] = {
    perfectOverclock: 0,
    speed: 1,
    power: (recipe, choices) => 1 - Math.min(0.5, (choices[0] || 0) * 0.1), // Assuming choices[0] is coil tier
    parallels: 256,
    choices: ["coilTier"],
    info: "Power consumption reduces with higher coil tiers.",
};

machines["Industrial Cutting Factory"] = {
    perfectOverclock: 0,
    speed: 3,
    power: 0.75,
    parallels: (recipe) => recipe.voltageTier * 4,
};

machines["Distillation Tower"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Dangote Distillus"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => choices[0] === "DTower" ? 3.5 : 2, // Assuming choices[0] is mode
    power: (recipe, choices) => choices[0] === "DTower" ? 0.15 : 1, // Assuming choices[0] is mode
    parallels: (recipe, choices) => {
        if (choices[0] === "DTower") {
            if (recipe.voltageTier === 1) return 4;
            if (recipe.voltageTier === 2) return 12;
            return 1; // Placeholder for other tiers
        } else if (choices[0] === "Distillery") {
            return (recipe.voltageTier || 1) * 4 * (choices[1] || 1); // Assuming choices[1] is InputTier
        }
        return 1; // Default
    },
    choices: ["mode", "inputTier"],
    info: "Parallels and speed/power depend on the mode (DTower or Distillery).",
};

machines["Mega Distillation Tower"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 256,
};

machines["Electric Implosion Compressor"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe, choices) => Math.pow(4, ((choices[0] as any) || 1) - 1), // Assuming choices[0] is containment block tier
    choices: ["containmentBlockTier"],
    info: "Parallels depend on the containment block tier.",
};

machines["Magnetic Flux Exhibitor"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => {
        // TODO: Implement speed bonus based on electromagnets
        return 1; // Placeholder
    },
    power: 1,
    parallels: 1,
    choices: ["electromagnetTier"],
    info: "Speed depends on the tier of electromagnets.",
};

machines["Dissection Apparatus"] = {
    perfectOverclock: 0,
    speed: 3,
    power: 0.85,
    parallels: (recipe, choices) => (choices[0] || 1) * 8, // Assuming choices[0] is Item Pipe Casing Tier
    choices: ["itemPipeCasingTier"],
};

machines["Industrial Extrusion Machine"] = {
    perfectOverclock: 0,
    speed: 3.5,
    power: 1,
    parallels: (recipe) => recipe.voltageTier * 4,
};

machines["Assembly Line"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Advanced Assembly Line"] = {
    perfectOverclock: 0,
    speed: (recipe) => {
        // TODO: Implement laser overclock logic
        return 1; // Placeholder
    },
    power: (recipe) => {
        // TODO: Implement power calculation with laser overclock
        return 1; // Placeholder
    },
    parallels: 1,
    info: "Performs laser overclock with extra amperage. Speed reduces recipe time by 50% per laser overclock. Power depends on the number of slices working and overclocked EU/t.",
};

machines["Large Fluid Extractor"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => 1.5 * Math.pow(1.10, (choices[0] || 0)), // Assuming choices[0] is Heating Coil Tier
    power: (recipe, choices) => 0.80 * Math.pow(0.90, (choices[0] || 0)), // Assuming choices[0] is Heating Coil Tier
    parallels: (recipe, choices) => (choices[1] || 1) * 8, // Assuming choices[1] is solenoid tier (MV is tier 2)
    choices: ["heatingCoilTier", "solenoidTier"],
};

machines["Thermic Heating Device"] = {
    perfectOverclock: 0,
    speed: 2.2,
    power: 0.9,
    parallels: (recipe) => recipe.voltageTier * 8,
};

machines["Furnace"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Multi Smelter"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe, choices) => {
        const coilTier = choices[0] || 0;
        return Math.min(8192, 8 * Math.pow(2, coilTier));
    },
    choices: ["coilTier"],
    info: "Parallels increase with coil tier.",
};

machines["Industrial Sledgehammer"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 1,
    parallels: (recipe, choices) => (recipe.voltageTier || 1) * (choices[0] || 1) * 8, // Assuming choices[0] is Anvil Tier
    choices: ["anvilTier"],
};

machines["Nuclear Reactor"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Implosion Compressor"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Density^2"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 1,
    parallels: (recipe) => Math.floor((recipe.voltageTier || 1) / 2) + 1,
};

machines["Large Chemical Reactor"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Mega Chemical Reactor"] = {
    perfectOverclock: Number.POSITIVE_INFINITY,
    speed: 1,
    power: 1,
    parallels: 256,
};

machines["Hyper-Intensity Laser Engraver"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => Math.cbrt(choices[0] || 1), // Assuming choices[0] is laser source amperage input
    power: 0.8,
    parallels: 1,
    choices: ["laserAmperage"],
    info: "Speed is the cube root of laser source amperage input.",
};

machines["Industrial Precision Lathe"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => 100 / (1 / ((choices[0] || 0) + (recipe.voltageTier || 1) / 4)), // Assuming choices[0] is Item Pipe Casing Speed Boost
    power: 0.8,
    parallels: (recipe, choices) => (choices[0] || 0) + (recipe.voltageTier || 1) * 2, // Assuming choices[0] is Item Pipe Casing Parallel
    choices: ["itemPipeCasingSpeedBoost", "itemPipeCasingParallel"],
};

machines["Industrial Maceration Stack"] = {
    perfectOverclock: 0,
    speed: 1.6,
    power: 1,
    parallels: (recipe, choices) => {
        const hasUpgrade = choices[0] === "Maceration Upgrade Chip";
        const n = hasUpgrade ? 8 : 2;
        return n * (recipe.voltageTier || 1);
    },
    choices: ["upgradeChip"],
    info: "Parallels depend on whether the Maceration Upgrade Chip is inserted.",
};

machines["Industrial Material Press"] = {
    perfectOverclock: 0,
    speed: 6,
    power: 1,
    parallels: (recipe) => (recipe.voltageTier || 1) * 4,
};

machines["Nano Forge"] = {
    perfectOverclock: (recipe, choices) => (recipe.voltageTier || 1) > (recipe.voltageTier || 1), // Always false for now, need to compare recipe tier to machine tier
    speed: 1,
    power: 1,
    parallels: 1,
    info: "Gains perfect overclock if recipe tier is lower than Nano Forge tier.  Need access to machine tier to implement perfectOverclock correctly",
};

machines["Neutronium Compressor"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 8,
};

machines["Amazon Warehousing Depot"] = {
    perfectOverclock: 0,
    speed: 6,
    power: 0.75,
    parallels: (recipe) => (recipe.voltageTier || 1) * 16,
};

machines["PCB Factory"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => {
        // TODO: Implement speed calculation based on trace size
        return 1; // Placeholder
    },
    power: (recipe, choices) => Math.sqrt(choices[0] || 1), // Assuming choices[0] is number of structures
    parallels: (recipe, choices) => {
        const nanites = choices[1] || 1; // Assuming choices[1] is nanites
        if (nanites >= 8) return 4;
        if (nanites >= 4) return 3;
        if (nanites >= 2) return 2;
        return 1;
    },
    choices: ["structures", "nanites"],
    info: "Speed depends on trace size. Power is multiplied by the square root of structures. Parallels depend on nanites.",
};

machines["Dimensionally Transcendent Plasma Forge"] = {
    perfectOverclock: (recipe, choices) => choices[0] === "Convergence", // Assuming choices[0] indicates Convergence
    speed: 1,
    power: 1,
    parallels: 1,
    choices: ["convergence"],
    info: "Gains perfect overclock when Convergence is active. Fuel consumption can be reduced after 8 hours. Extra power cost during Perfect Overclocks is added in form of increased catalyst amounts. Need to implement convergence and time logic.",
};

machines["Bricked Blast Furnace"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Clarifier Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Residual Decontaminant Degasser Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Flocculation Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Ozonation Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["pH Neutralization Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Extreme Temperature Fluctuation Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Absolute Baryonic Perfection Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe, choices) => 1 + (choices[0] || 0), // Assuming choices[0] is number of successful recipes
    choices: ["successfulRecipes"],
    info: "Parallels increase per successful recipe.",
};

machines["High Energy Laser Purification Unit"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Pyrolyse Oven"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => (choices[0] || 1) * 0.5, // Assuming choices[0] is coil tier (CuNi: 1, FeAlCr: 2, etc.)
    power: 1,
    parallels: 1,
    choices: ["coils"],
};

machines["Elemental Duplicator"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 1,
    parallels: (recipe) => 8 * (recipe.voltageTier || 1),
};

machines["Research station"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Boldarnator"] = {
    perfectOverclock: 0,
    speed: 3,
    power: 0.75,
    parallels: (recipe) => (recipe.voltageTier || 1) * 8,
};

machines["Large Thermal Refinery"] = {
    perfectOverclock: 0,
    speed: 2.5,
    power: 0.8,
    parallels: (recipe) => (recipe.voltageTier || 1) * 8,
};

machines["Transcendent Plasma Mixer"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe, choices) => choices[0] || 1, // Assuming choices[0] is the parallel setting
    choices: ["parallels"],
    info: "Parallels are set in the parallel menu.",
};

machines["Forge of the Gods"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => {
        // TODO: Implement speed bonuses based on upgrades
        return 1; // Placeholder
    },
    power: 1,
    parallels: 16,
    choices: ["upgrades"],
    info: "Speed depends on upgrades.",
};

machines["Vacuum Freezer"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Mega Vacuum Freezer"] = {
    perfectOverclock: Number.POSITIVE_INFINITY, // Assuming perfect overclocks are always possible with exotic coolants
    speed: 1,
    power: 1,
    parallels: 256,
    choices: ["coolants", "upgradeTier"],
    info: "Up to 3 perfect overclocks with exotic coolants after Tier 2 upgrade. Need to implement coolant and upgrade logic.",
};

machines["Industrial Wire Factory"] = {
    perfectOverclock: 0,
    speed: 3,
    power: 0.75,
    parallels: (recipe) => (recipe.voltageTier || 1) * 4,
};

machines["Digester"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Dissolution Tank"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Source Chamber"] = {
    perfectOverclock: 0,
    speed: (recipe) => {
        // TODO: Implement speed scaling with EU/t
        return 1; // Placeholder
    },
    power: 1,
    parallels: 1,
    info: "Output energy scales with EU/t up to the point shown in the recipe.",
};

machines["Target Chamber"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Alloy Blast Smelter"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Mega Alloy Blast Smelter"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => 1 + (choices[0] >= 5 && choices[1] ? 0.25 : 0), // Assuming choices[0] is coil tier, choices[1] is glass tier present (true/false)
    power: (recipe, choices) => 1 - Math.min(0.25, (choices[0] || 0) > (recipe.voltageTier || 1) ? ((choices[0] || 0) - (recipe.voltageTier || 1)) * 0.05 : 0), // Assuming choices[0] is coil tier
    parallels: 256,
    choices: ["coilTier", "glassTierPresent"],
    info: "Speed bonus if coil tier is TPV or higher and equivalent or better glass tier is present. Power consumption reduction per coil tier above recipe tier.",
};

machines["Industrial Coke Oven"] = {
    perfectOverclock: 0,
    speed: 1,
    power: (recipe, choices) => 1 - (recipe.voltageTier || 1) * 0.04, // Assuming recipe.voltageTier is voltage tier
    parallels: (recipe, choices) => choices[0] === "Heat Proof Casings" ? 24 : 12, // Assuming choices[0] is casing type
    choices: ["casingType"],
    info: "Energy discount per voltage tier. Parallels depend on casing type.",
};

machines["Cryogenic Freezer"] = {
    perfectOverclock: 0,
    speed: 2,
    power: 1,
    parallels: 4,
};

machines["COMET - Compact Cyclotron"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Zhuhai - Fishing Port"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe) => ((recipe.voltageTier || 1) + 1) * 2,
};

machines["Reactor Fuel Processing Plant"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Flotation Cell Regulator"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["ExxonMobil Chemical Plant"] = {
    perfectOverclock: 0,
    speed: (recipe, choices) => {
        const coilTier = choices[0] || 1; // Default to 1 if no choice
        if (coilTier === 1) return 1.5;
        if (coilTier === 2) return 2;
        if (coilTier === 3) return 2.5;
        return 1 + (coilTier - 1) * 0.5; // General formula
    },
    power: 1,
    parallels: (recipe, choices) => (choices[1] || 1) * 2, // Assuming choices[1] is pipe casing tier
    choices: ["coilTier", "pipeCasingTier"],
    info: "Speed increases with higher tier coils. Parallels depend on pipe casing tier.",
};

machines["Thorium Reactor [LFTR]"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Matter Fabrication CPU"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 0.8,
    parallels: (recipe, choices) => choices[0] === "Scrap" ? 64 : 8 * (recipe.voltageTier || 1), // Assuming choices[0] is mode
    choices: ["mode"],
    info: "Parallels depend on the mode (Scrap or UU).",
};

machines["Molecular Transformer"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Industrial Centrifuge"] = {
    perfectOverclock: 0,
    speed: 2.25,
    power: 0.9,
    parallels: (recipe) => (recipe.voltageTier || 1) * 6,
};

machines["Utupu-Tanuri"] = {
    perfectOverclock: (recipe, choices) => (choices[0] || 0) > 0, // Assuming choices[0] is number of 1800K increments over min heat
    speed: (recipe, choices) => 2.2 + (choices[0] || 0) > 0 ? 4 : 0.5,
    power: (recipe, choices) => 1 + (choices[0] || 0) * 0.05, // Assuming choices[0] is number of 900K increments over min heat
    parallels: 4,
    choices: ["heatIncrements"],
    info: "Perfect overclock, speed, and power depend on temperature increments over the minimum.",
};

machines["Industrial Electrolyzer"] = {
    perfectOverclock: 0,
    speed: 2.8,
    power: 0.9,
    parallels: (recipe) => (recipe.voltageTier || 1) * 2,
};

machines["Industrial Mixing Machine"] = {
    perfectOverclock: 0,
    speed: 3.5,
    power: 1,
    parallels: (recipe) => (recipe.voltageTier || 1) * 8,
};

machines["Nuclear Salt Processing Plant"] = {
    perfectOverclock: 0,
    speed: 2.5,
    power: 1,
    parallels: (recipe) => (recipe.voltageTier || 1) * 2,
};

machines["IsaMill Grinding Machine"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Quantum Force Transformer"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: (recipe, choices) => 1 + (choices[0] || 0), // Assuming choices[0] is number of catalysts
    choices: ["catalysts"],
    info: "Parallels increase per catalyst.",
};

machines["Sparge Tower Controller"] = {
    perfectOverclock: 0,
    speed: 1,
    power: 1,
    parallels: 1,
};

machines["Tree Growth Simulator"] = {
    perfectOverclock: 0,
    speed: (recipe) => {
        // TODO: Implement fixed 5-second speed
        return 1; // Placeholder
    },
    power: 1,
    parallels: 1,
    info: "Speed is fixed at 5 seconds. Need to implement time based speed",
};

machines["Draconic Evolution Fusion Crafter"] = {
    perfectOverclock: (recipe, choices) => (choices[0] || 0) > (recipe.voltageTier || 1), // Assuming choices[0] is casing tier
    speed: (recipe, choices) => 1 / Math.max(1, (choices[0] || 1) - (recipe.voltageTier || 0)), // Assuming choices[0] is casing tier
    power: 1,
    parallels: 1,
    choices: ["casingTier"],
    info: "Gains perfect overclock if casings are above the recipe tier. Recipe time is divided by the number of tiers above the recipe.",
};