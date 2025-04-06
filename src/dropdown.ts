import { Goods, Repository, Item } from "./repository.js";

export class Dropdown {
    private static instance: Dropdown;
    private dropdown: HTMLElement;
    private currentTarget: HTMLElement | null = null;
    private clickCallback: ((goods: Goods) => void) | null = null;

    private constructor() {
        this.dropdown = document.getElementById("dropdown")!;
        
        // Hide dropdown when clicking anywhere
        document.addEventListener("click", (e) => {
            if (this.currentTarget) {
                // Ignore clicks on the target element that triggered the dropdown
                if (e.target === this.currentTarget || this.currentTarget.contains(e.target as Node)) {
                    return;
                }

                const target = e.target as HTMLElement;
                const itemIcon = target.closest('item-icon');
                
                if (itemIcon && this.clickCallback) {
                    const goodsId = itemIcon.getAttribute('data-id');
                    if (goodsId) {
                        const goods = Repository.current.GetById(goodsId);
                        this.clickCallback(goods as Goods);
                    }
                }
                
                this.hide();
            }
        });
    }

    public static getInstance(): Dropdown {
        if (!Dropdown.instance) {
            Dropdown.instance = new Dropdown();
        }
        return Dropdown.instance;
    }

    public show(target: HTMLElement, goodsList: Goods[], clickCallback?: (goods: Goods) => void): void {
        this.currentTarget = target;
        this.clickCallback = clickCallback || null;
        
        // Clear previous content
        this.dropdown.innerHTML = "";
        
        // Create icon grid
        const grid = document.createElement('div');
        grid.className = 'icon-grid';
        let width = Math.min(goodsList.length, 3);
        let height = Math.ceil(goodsList.length / width);
        grid.style.setProperty('--grid-width', width.toString());
        grid.style.setProperty('--grid-height', height.toString());
        
        // Add item icons
        for (let index = 0; index < goodsList.length; index++) {
            const goods = goodsList[index];
            const itemIcon = document.createElement('item-icon');
            itemIcon.className = 'item-icon-grid';
            itemIcon.setAttribute('data-id', goods.id.toString());
            itemIcon.setAttribute('data-action', 'select');
            itemIcon.style.setProperty('--grid-position', index.toString());
            grid.appendChild(itemIcon);
        }
        
        this.dropdown.appendChild(grid);
        this.dropdown.style.display = "block";
        
        // Position the dropdown
        const targetRect = target.getBoundingClientRect();
        const dropdownRect = this.dropdown.getBoundingClientRect();
        
        // Check if there's enough space below
        const spaceBelow = window.innerHeight - targetRect.bottom;
        const spaceAbove = targetRect.top;
        
        if (spaceBelow >= dropdownRect.height || spaceBelow > spaceAbove) {
            // Position below
            this.dropdown.style.top = `${targetRect.bottom}px`;
        } else {
            // Position above
            this.dropdown.style.top = `${targetRect.top - dropdownRect.height}px`;
        }
        
        // Center horizontally relative to target
        this.dropdown.style.left = `${targetRect.left + (targetRect.width - dropdownRect.width) / 2}px`;
    }

    public hide(): void {
        this.currentTarget = null;
        this.clickCallback = null;
        this.dropdown.style.display = "none";
    }

    public isVisible(): boolean {
        return this.dropdown.style.display === "block";
    }
}

export function ShowDropdown(target: HTMLElement, goodsList: Goods[], clickCallback?: (goods: Goods) => void): void {
    Dropdown.getInstance().show(target, goodsList, clickCallback);
}
