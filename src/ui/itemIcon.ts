import { Repository, Goods, Item, Fluid, OreDict, RecipeObject } from "../data/repository.js";
import { ShowNei, ShowNeiContext, ShowNeiMode } from "./nei.js";
import { ShowTooltip, HideTooltip, IsHovered } from "./tooltip.js";

// Global cycling state
let globalIndex = 0;
let oredictElements: IconBox[] = [];

// Start global cycle once
window.setInterval(() => {
    globalIndex++;
    for (const element of oredictElements) {
        element.UpdateIconId();
    }
}, 500);

export class IconBox extends HTMLElement
{
    private obj:RecipeObject | null = null;

    constructor()
    {
        super();
        this.addEventListener("mouseenter", () => ShowTooltip(this, this.GetDisplayObject()));
        this.addEventListener("mouseleave", () => HideTooltip(this));
        this.addEventListener('contextmenu', this.RightClick);
        this.addEventListener('click', this.LeftClick);
        this.UpdateIconId();
    }

    private StartOredictCycle(oredict: OreDict) {
        if (!oredict || oredict.items.length === 0) return;
        
        this.UpdateIconId();
        
        // Add to global cycle if not already there
        if (!oredictElements.includes(this)) {
            oredictElements.push(this);
        }
    }

    private StopOredictCycle() {
        const index = oredictElements.indexOf(this);
        if (index > -1) {
            oredictElements.splice(index, 1);
        }
    }

    UpdateIconId() {
        const obj = this.GetDisplayObject();
        if (obj) {
            this.style.setProperty('--icon-id', obj.iconId.toString());
            
            // Update tooltip if this element is currently being hovered
            if (IsHovered(this)) {
                ShowTooltip(this, obj);
            }
        }
    }

    static get observedAttributes() {
        return ['data-id'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'data-id') {
            this.StopOredictCycle();
            this.obj = Repository.current.GetById<RecipeObject>(newValue);
            if (this.obj instanceof OreDict) {
                this.StartOredictCycle(this.obj);
            } else {
                this.UpdateIconId();
            }
        }
    }

    GetDisplayObject():Goods | null
    {
        if (this.obj instanceof Goods) {
            return this.obj;
        }

        if (this.obj instanceof OreDict) {
            return Repository.current.GetObject(this.obj.items[globalIndex % this.obj.items.length], Item);
        }

        return null;
    }

    disconnectedCallback()
    {
        this.StopOredictCycle();
        HideTooltip(this);
    }

    RightClick(event:any)
    {
        if (event.ctrlKey || event.metaKey)
            return;
        event.preventDefault();
        ShowNei(this.obj, ShowNeiMode.Consumption, null);
    }

    LeftClick()
    {
        ShowNei(this.obj, ShowNeiMode.Production, null);
    }
}

customElements.define("item-icon", IconBox);
console.log("Registered custom element: item-icon");