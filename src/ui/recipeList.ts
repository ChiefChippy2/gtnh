import { ShowNei, ShowNeiMode, ShowNeiCallback } from "./nei.js";
import { Goods, Repository, Item, Fluid, Recipe } from "../data/repository.js";
import { UpdateProject, addProjectChangeListener, removeProjectChangeListener, GetByIid, RecipeModel, RecipeGroupModel, ProductModel, ModelObject, PageModel, DragAndDrop, page } from "../project.js";

interface Product {
    goods: Goods;
    amount: number;
}

type ActionHandler = (obj: ModelObject, parent: ModelObject, event: Event, target: HTMLElement) => void;

export class RecipeList {
    private productItemsContainer: HTMLElement;
    private recipeItemsContainer: HTMLElement;
    private actionHandlers: Map<string, ActionHandler> = new Map();

    constructor() {
        this.productItemsContainer = document.querySelector(".product-items")!;
        this.recipeItemsContainer = document.querySelector(".recipe-items")!;
        this.setupActionHandlers();
        this.setupGlobalEventListeners();
        this.setupDragAndDrop();
        this.updateProductList();
        this.updateRecipeList();
        
        // Listen for project changes
        addProjectChangeListener(() => {
            this.updateProductList();
            this.updateRecipeList();
        });
    }

    private setupActionHandlers() {
        this.actionHandlers.set("delete_product", (obj, parent) => {
            if (obj instanceof ProductModel && parent instanceof PageModel) {
                const index = parent.products.findIndex((p: ProductModel) => p.iid === obj.iid);
                if (index !== -1) {
                    parent.products.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("update_amount", (obj) => {
            if (obj instanceof ProductModel) {
                obj.amount = (obj as any).amount;
                UpdateProject();
            }
        });

        this.actionHandlers.set("add_recipe", (obj) => {
            if (obj instanceof RecipeGroupModel) {
                this.showNeiForRecipeSelection(obj);
            }
        });

        this.actionHandlers.set("add_group", (obj) => {
            if (obj instanceof RecipeGroupModel) {
                this.addGroup(obj);
            }
        });

        this.actionHandlers.set("toggle_collapse", (obj) => {
            if (obj instanceof RecipeGroupModel) {
                obj.collapsed = !obj.collapsed;
                UpdateProject(true);
            }
        });

        this.actionHandlers.set("add_product", (obj) => {
            if (obj instanceof PageModel) {
                this.showNeiForProductSelection();
            }
        });

        this.actionHandlers.set("delete_recipe", (obj, parent) => {
            if (obj instanceof RecipeModel && parent instanceof RecipeGroupModel) {
                const index = parent.elements.findIndex(el => el.iid === obj.iid);
                if (index !== -1) {
                    parent.elements.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("delete_group", (obj, parent) => {
            if (obj instanceof RecipeGroupModel && parent instanceof RecipeGroupModel) {
                const index = parent.elements.findIndex(el => el.iid === obj.iid);
                if (index !== -1) {
                    parent.elements.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("update_group_name", (obj, parent, event, target) => {
            if (obj instanceof RecipeGroupModel) {
                obj.name = (target as HTMLInputElement).value;
            }
        });
    }

    private setupGlobalEventListeners() {
        // Global event listener for all buttons with iid and action
        document.addEventListener("click", (e) => {
            const button = (e.target as HTMLElement).closest("[data-iid][data-action]") as HTMLElement;
            if (button) {
                const iid = parseInt(button.getAttribute("data-iid")!);
                const action = button.getAttribute("data-action")!;
                const result = GetByIid(iid);
                if (result) {
                    const handler = this.actionHandlers.get(action);
                    if (handler) {
                        handler(result.current, result.parent, e, button);
                    }
                }
            }
        });

        // Global event listener for amount inputs
        document.addEventListener("change", (e) => {
            const amountInput = (e.target as HTMLElement).closest(".amount") as HTMLElement;
            if (amountInput) {
                const productItem = amountInput.closest(".product-item") as HTMLElement;
                if (productItem) {
                    const iid = parseInt(productItem.getAttribute("data-iid")!);
                    const result = GetByIid(iid);
                    if (result) {
                        const handler = this.actionHandlers.get("update_amount");
                        if (handler) {
                            (result.current as any).amount = parseFloat((amountInput as HTMLInputElement).value);
                            handler(result.current, result.parent, e, amountInput);
                        }
                    }
                }
            }
        });

        // Global event listener for group name inputs - blur event to save changes
        document.addEventListener("blur", (e) => {
            const nameInput = (e.target as HTMLElement).closest("[data-action='update_group_name']") as HTMLElement;
            if (nameInput) {
                const iid = parseInt(nameInput.getAttribute("data-iid")!);
                const result = GetByIid(iid);
                if (result) {
                    const handler = this.actionHandlers.get("update_group_name");
                    if (handler) {
                        handler(result.current, result.parent, e, nameInput);
                    }
                }
            }
        });

        // Global event listener for group name inputs - Enter key to save changes
        document.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const nameInput = (e.target as HTMLElement).closest("[data-action='update_group_name']") as HTMLElement;
                if (nameInput) {
                    const iid = parseInt(nameInput.getAttribute("data-iid")!);
                    const result = GetByIid(iid);
                    if (result) {
                        const handler = this.actionHandlers.get("update_group_name");
                        if (handler) {
                            handler(result.current, result.parent, e, nameInput);
                        }
                    }
                    // Blur the input to remove focus
                    nameInput.blur();
                }
            }
        });
    }

    private setupDragAndDrop() {
        document.addEventListener("dragstart", (e) => {
            const draggable = (e.target as HTMLElement).closest("[draggable]");
            if (draggable) {
                draggable.classList.add("dragging");
                e.dataTransfer?.setData("text/plain", draggable.getAttribute("data-iid") || "");
            }
        });

        document.addEventListener("dragend", (e) => {
            const draggable = (e.target as HTMLElement).closest("[draggable]");
            if (draggable) {
                draggable.classList.remove("dragging");
            }
        });

        document.addEventListener("dragover", (e) => {
            e.preventDefault();
            const dropZone = (e.target as HTMLElement).closest(".recipe-item, .recipe-group, .group-content");
            if (dropZone) {
                dropZone.classList.add("drag-over");
            }
        });

        document.addEventListener("dragleave", (e) => {
            const dropZone = (e.target as HTMLElement).closest(".recipe-item, .recipe-group, .group-content");
            if (dropZone) {
                dropZone.classList.remove("drag-over");
            }
        });

        document.addEventListener("drop", (e) => {
            e.preventDefault();
            const dropZone = (e.target as HTMLElement).closest(".recipe-item, .recipe-group, .group-content");
            if (!dropZone) return;

            dropZone.classList.remove("drag-over");
            const draggedIid = parseInt(e.dataTransfer?.getData("text/plain") || "0");
            
            // Get the target iid
            let targetIid: number;
            if (dropZone.classList.contains("group-content")) {
                // Dropping into a group
                targetIid = parseInt(dropZone.getAttribute("data-group-iid") || "0");
            } else {
                // Dropping on a recipe or group
                targetIid = parseInt(dropZone.getAttribute("data-iid") || "0");
            }

            // Call DragAndDrop with the two iids
            DragAndDrop(draggedIid, targetIid);
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

    private showNeiForRecipeSelection(targetGroup: RecipeGroupModel) {
        const callback: ShowNeiCallback = {
            canSelectGoods: () => false,
            canSelectRecipe: () => true,
            onSelectGoods: () => {}, // Not used
            onSelectRecipe: (recipe: Recipe) => {
                this.addRecipe(recipe, targetGroup);
            }
        };

        ShowNei(null, ShowNeiMode.Production, callback);
    }

    private addProduct(goods: Goods, amount: number) {
        page.products.push(new ProductModel({
            goodsId: goods.id,
            amount: goods instanceof Fluid ? 1000 : 1
        }));
        UpdateProject();
    }

    private addRecipe(recipe: Recipe, targetGroup: RecipeGroupModel) {
        targetGroup.elements.push(new RecipeModel({ recipeId: recipe.id }));
        UpdateProject();
    }

    private addGroup(targetGroup: RecipeGroupModel) {
        targetGroup.elements.push(new RecipeGroupModel());
        UpdateProject();
    }

    private renderIoInfo(): string {
        return `
            <div class="io-info">
                <div class="io-column inputs">
                    <div class="io-label">Input</div>
                </div>
                <div class="io-column outputs">
                    <div class="io-label">Output</div>
                </div>
            </div>
        `;
    }

    private renderRecipe(recipe: RecipeModel): string {
        return `
            <div class="recipe-item" data-iid="${recipe.iid}" draggable="true">
                <div class="short-info">
                    ${recipe.recipeId}
                </div>
                ${this.renderIoInfo()}
                <button class="button delete-btn" data-iid="${recipe.iid}" data-action="delete_recipe">×</button>
            </div>
        `;
    }

    private renderCollapsedGroup(group: RecipeGroupModel): string {
        return `
            <div class="recipe-group collapsed" data-iid="${group.iid}" draggable="true">
                <div class="group-header">
                    <button class="collapse-btn" data-iid="${group.iid}" data-action="toggle_collapse">
                        <img src="assets/images/Arrow_Small_Right.png" alt="Expand">
                    </button>
                    <div class="short-info">
                        <input type="text" class="group-name-input" value="${group.name}" data-iid="${group.iid}" data-action="update_group_name">
                    </div>
                </div>
                ${this.renderIoInfo()}
                <button class="button delete-btn" data-iid="${group.iid}" data-action="delete_group">×</button>
            </div>
        `;
    }

    private renderLinks(links: string[]): string {
        if (links.length === 0) return '';
        
        return `
            <div class="group-links">
                <span class="links-label">Links:</span>
                <div class="links-grid">
                    ${links.map(linkId => {
                        const goods = Repository.current.GetById<Goods>(linkId);
                        return goods ? `<item-icon data-id="${linkId}"></item-icon>` : '';
                    }).join('')}
                </div>
            </div>
        `;
    }

    private renderExpandedGroup(group: RecipeGroupModel, level: number = 0): string {
        return `
            <div class="recipe-group" data-iid="${group.iid}">
                <div class="group-header">
                    <button class="collapse-btn" data-iid="${group.iid}" data-action="toggle_collapse">
                        <img src="assets/images/Arrow_Small_Down.png" alt="Collapse">
                    </button>
                    <input type="text" class="group-name-input" value="${group.name}" data-iid="${group.iid}" data-action="update_group_name">
                    <button class="button add-recipe-btn" data-iid="${group.iid}" data-action="add_recipe">Add Recipe</button>
                    <button class="button add-group-btn" data-iid="${group.iid}" data-action="add_group">Add Group</button>
                    <button class="button delete-btn" data-iid="${group.iid}" data-action="delete_group">×</button>
                </div>
                <div class="group-content" data-group-iid="${group.iid}">
                    ${this.renderLinks(group.links)}
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
                    <span class="group-name">Root Group</span>
                    <button class="button add-recipe-btn" data-iid="${group.iid}" data-action="add_recipe">Add Recipe</button>
                    <button class="button add-group-btn" data-iid="${group.iid}" data-action="add_group">Add Group</button>
                </div>
                <div class="group-content">
                    ${this.renderLinks(group.links)}
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
        // Filter out zero amounts and sort by amount descending
        const products = page.products
            .filter(product => product instanceof ProductModel && product.amount !== 0)
            .sort((a, b) => (b as ProductModel).amount - (a as ProductModel).amount);

        this.productItemsContainer.innerHTML = `
            <button class="button add-product-btn" data-iid="${page.iid}" data-action="add_product">Add Product</button>
            ${products.map(product => {
                if (!(product instanceof ProductModel)) return '';
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
                        <button class="button delete-btn" data-iid="${product.iid}" data-action="delete_product">×</button>
                    </div>
                `;
            }).join("")}
        `;
    }

    private updateRecipeList() {
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