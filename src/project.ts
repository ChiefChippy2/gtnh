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
const MAX_HISTORY = 50;

export var project: Project = {
    pages: [{
        name: "Main",
        icon: "",
        links: [],
        recipes: []
    }]
};

// Undo history
let history: string[] = [];

// Event system
type ProjectChangeListener = () => void;
const changeListeners: ProjectChangeListener[] = [];

export function addProjectChangeListener(listener: ProjectChangeListener) {
    changeListeners.push(listener);
}

export function removeProjectChangeListener(listener: ProjectChangeListener) {
    const index = changeListeners.indexOf(listener);
    if (index > -1) {
        changeListeners.splice(index, 1);
    }
}

function notifyListeners() {
    changeListeners.forEach(listener => listener());
}

// Load project from storage
function loadProject() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            project = JSON.parse(stored);
            history.push(stored);
        } catch (e) {
            console.error("Failed to load project:", e);
        }
    }
}

// Save project to storage
function saveProject() {
    try {
        const json = JSON.stringify(project);
        localStorage.setItem(STORAGE_KEY, json);
        
        // Add to history
        history.push(json);
        if (history.length > MAX_HISTORY) {
            history.shift();
        }
    } catch (e) {
        console.error("Failed to save project:", e);
    }
}

export function UpdateProject() {
    saveProject();
    notifyListeners();
}

export function Undo() {
    if (history.length > 1) {
        history.pop(); // Remove current state
        const previousState = history[history.length - 1];
        try {
            project = JSON.parse(previousState);
            notifyListeners();
        } catch (e) {
            console.error("Failed to undo:", e);
        }
    }
}

// Load project on startup
loadProject();

// Add keyboard shortcut for undo
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        Undo();
    }
});