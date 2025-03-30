import { Goods } from "./data/repository";

let nextIid = 0;

export abstract class ModelObjectVisitor
{
    abstract VisitData(parent:ModelObject, key:string, data:any):void;
    abstract VisitObject(parent:ModelObject, key:string, obj:ModelObject):void;
    VisitArray(parent:ModelObject, key:string, array:ModelObject[]):void
    {
        for (const obj of array) {
            this.VisitObject(parent, key, obj);
        }
    }
}

class ModelObjectSerializer extends ModelObjectVisitor
{
    stack: object[] = [];
    current: {[key:string]: any} = {};

    VisitData(parent:ModelObject, key: string, data: any): void {
        this.current[key] = data;
    }

    VisitObject(parent:ModelObject, key: string, obj: ModelObject): void {
        this.stack.push(this.current);
        this.current = {};
        obj.Visit(this);
        let result = this.current;
        this.current = this.stack.pop()!;
        this.current[key] = result;
    }

    VisitArray(parent:ModelObject, key: string, array: ModelObject[]): void {
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
    result:ModelObject | null = null;
    resultParent:ModelObject | null = null;

    VisitData(parent:ModelObject, key: string, data: any): void {}
    VisitObject(parent:ModelObject, key: string, obj: ModelObject): void {
        if (this.result !== null)
            return;
        if (obj.iid === this.iid) {
            this.result = obj;
            this.resultParent = parent;
            return;
        }
        obj.Visit(this);
    }

    Scan(obj:ModelObject, parent:ModelObject, iid:number):iidScanResult
    {
        if (obj.iid === iid) {
            return {current:obj, parent:parent};
        }
        this.result = null;
        this.iid = iid;
        obj.Visit(this);
        return this.result === null || this.resultParent === null ? null : {current:this.result, parent:this.resultParent};
    }
}

let serializer = new ModelObjectSerializer();
let iidScanner = new ModelObjectIidScanner();

export function GetByIid(iid:number):iidScanResult
{
    return iidScanner.Scan(page, page, iid);
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

export class PageModel extends ModelObject
{
    name: string = "New Page";
    products: ProductModel[] = [];
    rootGroup: RecipeGroupModel = new RecipeGroupModel();

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData(this, "name", this.name);
        visitor.VisitArray(this, "products", this.products);
        visitor.VisitObject(this, "rootGroup", this.rootGroup);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (typeof source.name === "string")
                this.name = source.name;
            if (source.products instanceof Array)
                this.products = source.products.map((product: any) => new ProductModel(product));
            if (source.rootGroup instanceof Object)
                this.rootGroup = new RecipeGroupModel(source.rootGroup);
        }
    }
}

export var currentPage:PageModel = new PageModel({});

export class ProductModel extends ModelObject
{
    goodsId: string;
    amount: number = 1;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData(this, "goodsId", this.goodsId);
        visitor.VisitData(this, "amount", this.amount);
    }

    constructor(source:any = undefined)
    {
        super();
        this.goodsId = "";
        if (source instanceof Object) {
            if (typeof source.goodsId === "string")
                this.goodsId = source.goodsId;
            if (typeof source.amount === "number")
                this.amount = source.amount;
        }
    }
}

export abstract class RecipeGroupEntry extends ModelObject{}

export class RecipeGroupModel extends RecipeGroupEntry
{
    links: string[] = [];
    elements: RecipeGroupEntry[] = [];
    collapsed: boolean = false;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData(this, "type", "recipe_group");
        visitor.VisitData(this, "links", this.links);
        visitor.VisitArray(this, "elements", this.elements);
        visitor.VisitData(this, "collapsed", this.collapsed);
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
        visitor.VisitData(this, "type", this.type);
        visitor.VisitData(this, "recipeId", this.recipeId);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (typeof source.recipeId === "string")
                this.recipeId = source.recipeId;
        }
    }
}

export function DragAndDrop(sourceIid:number, targetIid:number)
{
    var draggingObject = GetByIid(sourceIid);
    if (draggingObject === null || !(draggingObject.parent instanceof RecipeGroupModel))
        return;
    var targetObject = GetByIid(targetIid);
    if (targetObject === null)
        return;
    if (draggingObject.current instanceof RecipeGroupModel && !draggingObject.current.collapsed)
        return;
    console.log("DragAndDrop", draggingObject, targetObject);
    let success = false;

    if (targetObject.current instanceof RecipeGroupModel && !targetObject.current.collapsed) {
        targetObject.current.elements.push(draggingObject.current);
        success = true;
    } else if (targetObject.parent instanceof RecipeGroupModel) {
        var index = targetObject.parent.elements.indexOf(targetObject.current);
        if (index === -1)
            return;
        targetObject.parent.elements.splice(index, 0, draggingObject.current);
        success = true;
    }
    if (success) {
        draggingObject.parent.elements.splice(draggingObject.parent.elements.indexOf(draggingObject.current), 1);
        UpdateProject();
    }
}

const MAX_HISTORY = 50;

export var pageNames = Object.keys(localStorage).filter((key) => key.startsWith("page_")).sort();
let currentPageName = pageNames.length > 0 ? pageNames[0] : "page_0";
export var page: PageModel = loadPage(currentPageName)

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

function loadPage(key:string):PageModel
{
    currentPageName = key;
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            let projectData = JSON.parse(stored);
            return new PageModel(projectData);
        } catch (e) {
            console.error("Failed to load project:", e);
        }
    }
    return new PageModel();
}

// Save project to storage
function savePage() {
    try {
        const json = JSON.stringify(serializer.Serialize(page));
        localStorage.setItem(currentPageName, json);
        
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
    savePage();
    notifyListeners();
}

export function Undo() {
    if (history.length > 1) {
        history.pop(); // Remove current state
        const previousState = history[history.length - 1];
        try {
            page = new PageModel(JSON.parse(previousState));
            notifyListeners();
        } catch (e) {
            console.error("Failed to undo:", e);
        }
    }
}

// Add keyboard shortcut for undo
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        Undo();
    }
});