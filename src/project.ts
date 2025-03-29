export type Project = {
    pages: Page[];
}

export type Page = {
    name: string;
    icon: string;
    links: PageLink[];
    recipes: PageRecipe[];
}

export type PageLink = {
    goodsId: string;
    amount: number;
}

export type PageRecipe = {
    recipeId: string;
}

const STORAGE_KEY = "gtnh_calculator_project";

export var project: Project = {
    pages: [{
        name: "Main",
        icon: "",
        links: [],
        recipes: []
    }]
};

// Load project from storage
function loadProject() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            project = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to load project:", e);
        }
    }
}

// Save project to storage
function saveProject() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
        console.error("Failed to save project:", e);
    }
}

export function UpdateProject() {
    saveProject();
}

// Load project on startup
loadProject();