import { ShowNei, ShowNeiMode, ShowNeiCallback } from "./nei.js";
import { Goods, Repository, Item, Fluid, Recipe } from "../data/repository.js";
import { project, UpdateProject, addProjectChangeListener, removeProjectChangeListener } from "../project.js";

interface Product {
    goods: Goods;
    amount: number;
}

export class RecipeList {
    private productItemsContainer: HTMLElement;
    private recipeItemsContainer: HTMLElement;

    constructor() {
        this.productItemsContainer = document.querySelector(".product-items")!;
        this.recipeItemsContainer = document.querySelector(".recipe-items")!;
        this.setupGlobalEventListeners();
        this.updateProductList();
        this.updateRecipeList();
        
        // Listen for project changes
        addProjectChangeListener(() => {
            this.updateProductList();
            this.updateRecipeList();
        });
    }

    // Clean up when the component is destroyed
    destroy() {
        removeProjectChangeListener(() => {
            this.updateProductList();
            this.updateRecipeList();
        });
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

        // Global event listener for add recipe button
        document.addEventListener("click", (e) => {
            const addRecipeBtn = (e.target as HTMLElement).closest(".add-recipe-btn");
            if (addRecipeBtn) {
                this.showNeiForRecipeSelection();
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

    private showNeiForRecipeSelection() {
        const callback: ShowNeiCallback = {
            canSelectGoods: () => false,
            canSelectRecipe: () => true,
            onSelectGoods: () => {}, // Not used
            onSelectRecipe: (recipe: Recipe) => {
                this.addRecipe(recipe.objectOffset.toString());
            }
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

    private addRecipe(recipeId: string) {
        project.pages[0].recipes.push({
            recipeId: recipeId
        });
        UpdateProject();
    }

    private updateProductList() {
        // Filter out zero amounts and sort by amount descending
        const links = project.pages[0].links
            .filter(link => link.amount !== 0)
            .sort((a, b) => b.amount - a.amount);

        this.productItemsContainer.innerHTML = links.map(link => {
            const obj = Repository.current.GetGoodsById(link.goodsId);
            if (!obj || !(obj instanceof Goods)) return '';
            const goods = obj as Goods;
            const isFluid = goods instanceof Fluid;
            return `
                <div class="product-item">
                    <item-icon data-id="${goods.id}"></item-icon>
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

    private updateRecipeList() {
        this.recipeItemsContainer.innerHTML = project.pages[0].recipes.map(recipe => {
            return `
                <div class="recipe-item">
                    ${recipe.recipeId}
                </div>
            `;
        }).join("");
    }
}

// Initialize the recipe list
new RecipeList(); 