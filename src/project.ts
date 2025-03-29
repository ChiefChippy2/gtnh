import { Goods } from "./data/repository";

let nextIid = 0;

export abstract class ModelObjectVisitor
{
    abstract VisitData(key:string, data:any):void;
    abstract VisitObject(key:string, obj:ModelObject):void;
    abstract VisitArray(key:string, array:ModelObject[]):void;
}

class ModelObjectSerializer extends ModelObjectVisitor
{
    stack: object[] = [];
    current: {[key:string]: any} = {};

    VisitData(key: string, data: any): void {
        this.current[key] = data;
    }

    VisitObject(key: string, obj: ModelObject): void {
        this.stack.push(this.current);
        this.current = {};
        obj.Visit(this);
        let result = this.current;
        this.current = this.stack.pop()!;
        this.current[key] = result;
    }

    VisitArray(key: string, array: ModelObject[]): void {
        var arr = [];
        this.stack.push(this.current);
        for (const obj of array) {
            this.current = {};
            obj.Visit(this);
            arr.push(this.current);
        }
        this.current = this.stack.pop()!;
        this.current[key] = arr;
    }

    Serialize(obj:ModelObject):any
    {
        this.current = {};
        obj.Visit(this);
        return this.current;
    }
}

type iidScanResult = {current:ModelObject, parent:ModelObject} | null;

class ModelObjectIidScanner extends ModelObjectVisitor
{
    iid:number = 0;
    parent:ModelObject | null = null;
    result:ModelObject | null = null;

    VisitData(key: string, data: any): void {}
    VisitObject(key: string, obj: ModelObject): void {
        if (obj.iid === this.iid) {
            this.result = obj;
        }
        obj.Visit(this);
    }
    VisitArray(key: string, array: ModelObject[]): void {
        for (const obj of array) {
            this.VisitObject(key, obj);
        }
    }

    Scan(obj:ModelObject, iid:number):iidScanResult
    {
        this.parent = obj;
        this.iid = iid;
        obj.Visit(this);
        return this.result === null ? null : {current:this.result, parent:this.parent};
    }
}

let serializer = new ModelObjectSerializer();
let iidScanner = new ModelObjectIidScanner();

export function GetByIid(iid:number):iidScanResult
{
    return iidScanner.Scan(project.GetCurrentPage(), iid);
}

export abstract class ModelObject
{
    iid:number;
    abstract Visit(visitor:ModelObjectVisitor):void;

    constructor()
    {
        this.iid = nextIid++;
    }
}

export class ProjectModel extends ModelObject
{
    pages: PageModel[];
    selectedPage: number = 0;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitArray("pages", this.pages);
        visitor.VisitData("selectedPage", this.selectedPage);
    }

    public GetCurrentPage():PageModel
    {
        return this.pages[this.selectedPage];
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (source.pages instanceof Array)
                this.pages = source.pages.map((page: any) => new PageModel(page));
            else this.pages = [new PageModel()];
            if (source.selectedPage instanceof Number)
                this.selectedPage = Math.max(0, Math.min(Math.trunc(source.selectedPage), this.pages.length - 1));
        } else this.pages = [new PageModel()];
    }
}

export class PageModel extends ModelObject
{
    name: string = "New Page";
    products: any[] = [];
    rootGroup: RecipeGroupModel = new RecipeGroupModel();

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData("name", this.name);
        visitor.VisitArray("products", this.products);
        visitor.VisitObject("rootGroup", this.rootGroup);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (source.name instanceof String)
                this.name = source.name;
            if (source.products instanceof Array)
                this.products = source.products;
            if (source.rootGroup instanceof Object)
                this.rootGroup = new RecipeGroupModel(source.rootGroup);
        }
    }
}

export class ProductModel extends ModelObject
{
    goodsId: string = "";
    amount: number = 1;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData("goodsId", this.goodsId);
        visitor.VisitData("amount", this.amount);
    }
}

export abstract class RecipeGroupEntry extends ModelObject
{
}

export class RecipeGroupModel extends RecipeGroupEntry
{
    links: string[] = [];
    elements: RecipeGroupEntry[] = [];
    collapsed: boolean = false;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData("type", "recipe_group");
        visitor.VisitData("links", this.links);
        visitor.VisitArray("elements", this.elements);
        visitor.VisitData("collapsed", this.collapsed);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (source.links instanceof Array)
                this.links = source.links;
            if (source.elements instanceof Array)
                this.elements = source.elements.map((element: any) => {
                    if (element.type === "recipe")
                        return new RecipeModel(element);
                    else
                        return new RecipeGroupModel(element);
                });
            if (source.collapsed === true)
                this.collapsed = true;
        }
    }
}

export class RecipeModel extends RecipeGroupEntry
{
    type: string = "recipe";
    recipeId: string = "";

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData("type", this.type);
        visitor.VisitData("recipeId", this.recipeId);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (source.recipeId instanceof String)
                this.recipeId = source.recipeId;
        }
    }
}

const STORAGE_KEY = "gtnh_calculator_project";
const MAX_HISTORY = 50;

export var project: ProjectModel = new ProjectModel();
export var page: PageModel = project.pages[0];

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
            let projectData = JSON.parse(stored);
            project = new ProjectModel(projectData);
        } catch (e) {
            console.error("Failed to load project:", e);
        }
    }
}

// Save project to storage
function saveProject() {
    try {
        const json = JSON.stringify(serializer.Serialize(project));
        localStorage.setItem(STORAGE_KEY, json);
        
        // Add to history
        history.push(json);
        if (history.length > MAX_HISTORY) {
            history.shift();
        }
        console.log(json);
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
            project = new ProjectModel(JSON.parse(previousState));
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