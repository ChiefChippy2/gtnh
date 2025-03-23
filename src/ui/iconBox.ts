import { Goods } from "../data/repository.js";
import { ShowTooltip, HideTooltip } from "./tooltip.js";

export class IconBox extends HTMLElement
{
    goods:Goods | null = null;
    icon:HTMLElement | undefined;

    constructor()
    {
        super();
        this.addEventListener("mouseenter", () => ShowTooltip(this, this.goods));
        this.addEventListener("mouseleave", () => HideTooltip(this));
    }

    connectedCallback()
    {
        this.icon = document.createElement("div");
        this.icon.classList.add("icon");
        this.appendChild(this.icon);
    }

    SetGoods(goods: Goods | null)
    {
        this.goods = goods;
        if (this.icon) {
            if (goods == null) {
                this.icon.style.display = "none";
            } else {
                this.icon.style.display = "block";
                this.icon.style.setProperty("--icon-id", goods.iconId.toString());
            }
        }
    }
}

customElements.define("icon-box", IconBox);
console.log("Registered custom element: icon-box");