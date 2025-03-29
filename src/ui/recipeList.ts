import { ShowNei, ShowNeiMode, ShowNeiCallback } from "./nei.js";
import { Goods, Repository, Item, Fluid, Recipe } from "../data/repository.js";
import { project, UpdateProject, addProjectChangeListener, removeProjectChangeListener, GetByIid, RecipeModel, RecipeGroupModel } from "../project.js";

interface Product {
    goods: Goods;
    amount: number;
}

type ActionHandler = (obj: any) => void;

export class RecipeList {
    private productItemsContainer: HTMLElement;
    private recipeItemsContainer: HTMLElement;
    private actionHandlers: Map<string, ActionHandler> = new Map();

    constructor() {
        this.productItemsContainer = document.querySelector(".product-items")!;
        this.recipeItemsContainer = document.querySelector(".recipe-items")!;
        this.setupActionHandlers();
        this.setupGlobalEventListeners();
        this.updateProductList();
        this.updateRecipeList();
        
        // Listen for project changes
        addProjectChangeListener(() => {
            this.updateProductList();
            this.updateRecipeList();
        });
    }

    private setupActionHandlers() {
        this.actionHandlers.set("delete_product", (obj) => {
            const page = project.GetCurrentPage();
            const index = page.products.findIndex((p: any) => p.iid === obj.iid);
            if (index !== -1) {
                page.products.splice(index, 1);
                UpdateProject();
            }
        });

        this.actionHandlers.set("update_amount", (obj) => {
            const page = project.GetCurrentPage();
            const product = page.products.find((p: any) => p.iid === obj.iid);
            if (product) {
                product.amount = obj.amount;
                UpdateProject();
            }
        });

        this.actionHandlers.set("add_recipe", (obj) => {
            this.showNeiForRecipeSelection(obj);
        });

        this.actionHandlers.set("add_group", (obj) => {
            this.addGroup(obj);
        });

        this.actionHandlers.set("toggle_collapse", (obj) => {
            const result = GetByIid(obj.iid);
            if (result && result.current instanceof RecipeGroupModel) {
                result.current.collapsed = !result.current.collapsed;
                UpdateProject();
            }
        });
    }

    private setupGlobalEventListeners() {
        // Global event listener for all buttons with iid and action
        document.addEventListener("click", (e) => {
            const button = (e.target as HTMLElement).closest("[data-iid][data-action]");
            if (button) {
                const iid = parseInt(button.getAttribute("data-iid")!);
                const action = button.getAttribute("data-action")!;
                const handler = this.actionHandlers.get(action);
                if (handler) {
                    handler({ iid });
                }
            }
        });

        // Global event listener for amount inputs
        document.addEventListener("change", (e) => {
            const amountInput = (e.target as HTMLElement).closest(".amount");
            if (amountInput) {
                const productItem = amountInput.closest(".product-item");
                if (productItem) {
                    const iid = parseInt(productItem.getAttribute("data-iid")!);
                    const amount = parseFloat((amountInput as HTMLInputElement).value);
                    const handler = this.actionHandlers.get("update_amount");
                    if (handler) {
                        handler({ iid, amount });
                    }
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

    private showNeiForRecipeSelection(targetGroup: any) {
        const callback: ShowNeiCallback = {
            canSelectGoods: () => false,
            canSelectRecipe: () => true,
            onSelectGoods: () => {}, // Not used
            onSelectRecipe: (recipe: Recipe) => {
                this.addRecipe(recipe.objectOffset.toString(), targetGroup);
            }
        };

        ShowNei(null, ShowNeiMode.Production, callback);
    }

    private addProduct(goods: Goods, amount: number) {
        const page = project.GetCurrentPage();
        page.products.push({
            goodsId: goods.id,
            amount: goods instanceof Fluid ? 1000 : 1
        });
        UpdateProject();
    }

    private addRecipe(recipeId: string, targetGroup: any) {
        const result = targetGroup ? GetByIid(targetGroup.iid) : null;
        const group = result ? result.current : project.GetCurrentPage().rootGroup;
        
        if (group instanceof RecipeGroupModel) {
            group.elements.push(new RecipeModel({ recipeId }));
            UpdateProject();
        }
    }

    private addGroup(targetGroup: any) {
        const result = targetGroup ? GetByIid(targetGroup.iid) : null;
        const group = result ? result.current : project.GetCurrentPage().rootGroup;
        
        if (group instanceof RecipeGroupModel) {
            group.elements.push(new RecipeGroupModel());
            UpdateProject();
        }
    }

    private renderRecipe(recipe: RecipeModel): string {
        return `
            <div class="recipe-item" data-iid="${recipe.iid}">
                ${recipe.recipeId}
            </div>
        `;
    }

    private renderCollapsedGroup(group: RecipeGroupModel): string {
        return `
            <div class="recipe-group collapsed" data-iid="${group.iid}">
                <div class="group-header">
                    <button class="collapse-btn" data-action="toggle_collapse">▼</button>
                    <span class="group-name">Group</span>
                </div>
            </div>
        `;
    }

    private renderExpandedGroup(group: RecipeGroupModel, level: number = 0): string {
        return `
            <div class="recipe-group" data-iid="${group.iid}" style="margin-left: ${level * 20}px">
                <div class="group-header">
                    <button class="collapse-btn" data-action="toggle_collapse">▼</button>
                    <button class="add-recipe-btn" data-action="add_recipe">+ Add Recipe</button>
                    <button class="add-group-btn" data-action="add_group">+ Add Group</button>
                </div>
                <div class="group-content">
                    ${group.elements.map(entry => {
                        if (entry instanceof RecipeModel) {
                            return this.renderRecipe(entry);
                        } else if (entry instanceof RecipeGroupModel) {
                            return entry.collapsed ? 
                                this.renderCollapsedGroup(entry) : 
                                this.renderExpandedGroup(entry, level + 1);
                        }
                        return '';
                    }).join("")}
                </div>
            </div>
        `;
    }

    private renderRootGroup(group: RecipeGroupModel): string {
        return `
            <div class="recipe-group root-group" data-iid="${group.iid}">
                <div class="group-header">
                    <button class="add-recipe-btn" data-action="add_recipe">+ Add Recipe</button>
                    <button class="add-group-btn" data-action="add_group">+ Add Group</button>
                </div>
                <div class="group-content">
                    ${group.elements.map(entry => {
                        if (entry instanceof RecipeModel) {
                            return this.renderRecipe(entry);
                        } else if (entry instanceof RecipeGroupModel) {
                            return entry.collapsed ? 
                                this.renderCollapsedGroup(entry) : 
                                this.renderExpandedGroup(entry, 1);
                        }
                        return '';
                    }).join("")}
                </div>
            </div>
        `;
    }

    private updateProductList() {
        const page = project.GetCurrentPage();
        // Filter out zero amounts and sort by amount descending
        const products = page.products
            .filter(product => product.amount !== 0)
            .sort((a, b) => b.amount - a.amount);

        this.productItemsContainer.innerHTML = products.map(product => {
            const obj = Repository.current.GetById(product.goodsId);
            if (!obj || !(obj instanceof Goods)) return '';
            const goods = obj as Goods;
            return `
                <div class="product-item" data-iid="${product.iid}">
                    <item-icon data-id="${goods.id}"></item-icon>
                    <div class="amount-container">
                        <input type="number" class="amount" value="${product.amount}" min="-999999" step="0.1">
                        <span class="amount-unit">/min</span>
                    </div>
                    <div class="name">${goods.name}</div>
                    <button class="delete-btn" data-action="delete_product">×</button>
                </div>
            `;
        }).join("");
    }

    private updateRecipeList() {
        const page = project.GetCurrentPage();
        this.recipeItemsContainer.innerHTML = this.renderRootGroup(page.rootGroup);
    }

    // Clean up when the component is destroyed
    destroy() {
        removeProjectChangeListener(() => {
            this.updateProductList();
            this.updateRecipeList();
        });
    }
}

// Initialize the recipe list
new RecipeList(); 