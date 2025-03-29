import { ShowNei, ShowNeiMode, ShowNeiCallback } from "./nei.js";
import { Goods, Repository, Item, Fluid } from "../data/repository.js";
import { project, UpdateProject, addProjectChangeListener, removeProjectChangeListener } from "../project.js";

interface Product {
    goods: Goods;
    amount: number;
}

export class RecipeList {
    private productItemsContainer: HTMLElement;

    constructor() {
        this.productItemsContainer = document.querySelector(".product-items")!;
        this.setupGlobalEventListeners();
        this.updateProductList();
        
        // Listen for project changes
        addProjectChangeListener(() => this.updateProductList());
    }

    // Clean up when the component is destroyed
    destroy() {
        removeProjectChangeListener(() => this.updateProductList());
    }

    private setupGlobalEventListeners() {
        // Global event listener for delete buttons
        document.addEventListener("click", (e) => {
            const deleteBtn = (e.target as HTMLElement).closest(".delete-btn");
            if (deleteBtn) {
                const productItem = deleteBtn.closest(".product-item");
                if (productItem) {
                    const index = Array.from(this.productItemsContainer.children).indexOf(productItem);
                    project.pages[0].links.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        // Global event listener for amount inputs
        document.addEventListener("change", (e) => {
            const amountInput = (e.target as HTMLElement).closest(".amount");
            if (amountInput) {
                const productItem = amountInput.closest(".product-item");
                if (productItem) {
                    const index = Array.from(this.productItemsContainer.children).indexOf(productItem);
                    const amount = parseFloat((amountInput as HTMLInputElement).value);
                    project.pages[0].links[index].amount = amount;
                    UpdateProject();
                }
            }
        });

        // Global event listener for add product button
        document.addEventListener("click", (e) => {
            const addProductBtn = (e.target as HTMLElement).closest(".add-product-btn");
            if (addProductBtn) {
                this.showNeiForProductSelection();
            }
        });
    }

    private showNeiForProductSelection() {
        const callback: ShowNeiCallback = {
            canSelectGoods: () => true,
            canSelectRecipe: () => false,
            onSelectGoods: (goods: Goods, mode: ShowNeiMode) => {
                this.addProduct(goods, 1);
            },
            onSelectRecipe: () => {} // Not used
        };

        ShowNei(null, ShowNeiMode.Production, callback);
    }

    private addProduct(goods: Goods, amount: number) {
        project.pages[0].links.push({
            goodsId: goods.id,
            amount: goods instanceof Fluid ? 1000 : 1
        });
        UpdateProject();
    }

    private updateProductList() {
        // Filter out zero amounts and sort by amount descending
        const links = project.pages[0].links
            .filter(link => link.amount !== 0)
            .sort((a, b) => b.amount - a.amount);

        this.productItemsContainer.innerHTML = links.map(link => {
            const goods = Repository.current.GetGoodsById(link.goodsId);
            if (!goods) return '';
            const isFluid = goods instanceof Fluid;
            return `
                <div class="product-item">
                    <item-icon data-obj="${goods.objectOffset}" data-type="${isFluid ? 'fluid' : 'item'}"></item-icon>
                    <div class="amount-container">
                        <input type="number" class="amount" value="${link.amount}" min="-999999" step="0.1">
                        <span class="amount-unit">/min</span>
                    </div>
                    <div class="name">${goods.name}</div>
                    <button class="delete-btn">×</button>
                </div>
            `;
        }).join("");
    }
}

// Initialize the recipe list
new RecipeList(); 