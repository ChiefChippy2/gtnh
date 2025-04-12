import { Goods, Item, Recipe, RecipeObject } from "./repository.js";
import { SolvePage } from "./solver.js";
import { showConfirmDialog } from './dialogues.js';

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
export { serializer };
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

export class FlowInformation {
    input: {[key:string]:number} = {};
    output: {[key:string]:number} = {};
    energy: {[key:number]:number} = {};

    Add(goods:RecipeObject, amount:number, isOutput:boolean) {
        if (isOutput) {
            this.output[goods.id] = (this.output[goods.id] || 0) + amount;
        } else {
            this.input[goods.id] = (this.input[goods.id] || 0) + amount;
        }
    }

    Merge(other:FlowInformation) {
        for (const key in other.input) {
            if (other.input[key] === 0) continue;
            this.input[key] = (this.input[key] || 0) + other.input[key];
        }
        for (const key in other.output) {
            if (other.output[key] === 0) continue;
            this.output[key] = (this.output[key] || 0) + other.output[key];
        }
        for (const key in other.energy) {
            if (other.energy[key] === 0) continue;
            this.energy[key] = (this.energy[key] || 0) + other.energy[key];
        }
    }   
}

export enum LinkAlgorithm {
    Match,
    Ignore,
    //AtLeast,
    //AtMost,
}

let emptyFlow:FlowInformation = new FlowInformation();

export abstract class RecipeGroupEntry extends ModelObject{
    flow: FlowInformation = emptyFlow;
}

export class RecipeGroupModel extends RecipeGroupEntry
{
    links: {[key:string]:LinkAlgorithm} = {};
    actualLinks: {[key:string]:LinkAlgorithm} = {};
    elements: RecipeGroupEntry[] = [];
    collapsed: boolean = false;
    name: string = "Group";

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData(this, "type", "recipe_group");
        visitor.VisitData(this, "links", this.links);
        visitor.VisitArray(this, "elements", this.elements);
        visitor.VisitData(this, "collapsed", this.collapsed);
        visitor.VisitData(this, "name", this.name);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (source.links instanceof Object)
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
            if (typeof source.name === "string")
                this.name = source.name;
        }
    }
}

export class RecipeModel extends RecipeGroupEntry
{
    type: string = "recipe";
    recipeId: string = "";
    recipe?:Recipe;
    voltageTier: number = 0;
    crafter: string | undefined;
    choices: number[] = [];

    recipesPerMinute:number = 0;
    overclockFactor:number = 1;
    powerFactor:number = 1;
    parallels:number = 0;
    overclockTiers:number = 0;
    perfectOverclock:boolean = false;
    selectedOreDicts:{[key:string]:Item} = {};
    solverInfo?:string;

    Visit(visitor: ModelObjectVisitor): void {
        visitor.VisitData(this, "type", this.type);
        visitor.VisitData(this, "recipeId", this.recipeId);
        visitor.VisitData(this, "voltageTier", this.voltageTier);
        visitor.VisitData(this, "crafter", this.crafter);
        visitor.VisitData(this, "choices", this.choices);
    }

    constructor(source:any = undefined)
    {
        super();
        if (source instanceof Object) {
            if (typeof source.recipeId === "string")
                this.recipeId = source.recipeId;
            if (typeof source.voltageTier === "number")
                this.voltageTier = source.voltageTier;
            if (typeof source.crafter === "string")
                this.crafter = source.crafter;
            if (source.choices instanceof Array)
                this.choices = source.choices;
        }
    }
}

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

export class PageModel extends ModelObject
{
    name: string = "New Page";
    products: ProductModel[] = [];
    rootGroup: RecipeGroupModel = new RecipeGroupModel();
    private history: string[] = [];
    private readonly MAX_HISTORY = 50;
    status: "not solved" | "solved" | "infeasible" | "unbounded" = "not solved";

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

    // Undo history methods
    addToHistory(json:string) {
        this.history.push(json);
        if (this.history.length > this.MAX_HISTORY) {
            this.history.shift();
        }
    }

    undo(): boolean {
        if (this.history.length > 1) {
            this.history.pop(); // Remove current state
            const previousState = this.history[this.history.length - 1];
            try {
                const previousPage = new PageModel(JSON.parse(previousState));
                this.name = previousPage.name;
                this.products = previousPage.products;
                this.rootGroup = previousPage.rootGroup;
                SolvePage(this);
                return true;
            } catch (e) {
                console.error("Failed to undo:", e);
            }
        }
        return false;
    }
}

export function DragAndDrop(sourceIid:number, targetIid:number)
{
    if (sourceIid === targetIid)
        return;

    var draggingObject = GetByIid(sourceIid);
    if (draggingObject === null || !(draggingObject.parent instanceof RecipeGroupModel) || !(draggingObject.current instanceof RecipeGroupEntry))
        return;
    var targetObject = GetByIid(targetIid);
    if (targetObject === null || !(targetObject.parent instanceof RecipeGroupModel) || !(targetObject.current instanceof RecipeGroupEntry))
        return;
    if (draggingObject.current instanceof RecipeGroupModel && !draggingObject.current.collapsed)
        return;
    console.log("DragAndDrop", draggingObject, targetObject);
    let success = false;

    if (targetObject.current instanceof RecipeGroupModel && !targetObject.current.collapsed) {
        draggingObject.parent.elements.splice(draggingObject.parent.elements.indexOf(draggingObject.current), 1);
        targetObject.current.elements.push(draggingObject.current);
        success = true;
    } else if (targetObject.parent instanceof RecipeGroupModel) {
        draggingObject.parent.elements.splice(draggingObject.parent.elements.indexOf(draggingObject.current), 1);
        var index = targetObject.parent.elements.indexOf(targetObject.current);
        if (index === -1)
            return;
        targetObject.parent.elements.splice(index, 0, draggingObject.current);
        success = true;
    }
    if (success) {
        UpdateProject();
    }
}


const changeListeners: ProjectChangeListener[] = [];
export let page: PageModel;

// Event system
type ProjectChangeListener = () => void;

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

export function SetCurrentPage(newPage: PageModel) {
    console.log("SetCurrentPage", newPage);
    page = newPage;
    UpdateProject();
}

export function UpdateProject(visualOnly:boolean = false) {
    if (!visualOnly)
        SolvePage(page);
    notifyListeners();
}

async function GetUrlHashFromJson(json:string):Promise<string>
{
    const encoder = new TextEncoder();
    const data = encoder.encode(json);
    const compressedStream = new CompressionStream('deflate');
    const writer = compressedStream.writable.getWriter();
    writer.write(data);
    writer.close();
    const compressedBytes = await new Response(compressedStream.readable).arrayBuffer();
    const compressed = String.fromCharCode(...new Uint8Array(compressedBytes));
    const base64 = btoa(compressed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
}

export async function ShareCurrentPage() {
    const serialized = serializer.Serialize(page);
    
    showConfirmDialog(
        `Share page "${page.name}"`,
        "Copy URL to clipboard",
        "Download",
        "Cancel"
    ).then(async action => {
        if (action === "option1") {
            // Copy URL to clipboard
            try {
                const jsonString = JSON.stringify(serialized);
                const hash = await GetUrlHashFromJson(jsonString);
                const url = `${window.location.origin}${window.location.pathname}#${hash}`;
                await navigator.clipboard.writeText(url);
            } catch (e) {
                console.error("Failed to copy URL to clipboard:", e);
            }
        } else if (action === "option2") {
            // Download
            const prettyJson = JSON.stringify(serialized, null, 2);
            const blob = new Blob([prettyJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${page.name}.gtnh`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        // If cancel, do nothing
    });
}