import { ShowNei, ShowNeiMode, ShowNeiCallback } from "./nei.js";
import { Goods, Repository, Item, Fluid, Recipe } from "./repository.js";
import { UpdateProject, addProjectChangeListener, GetByIid, RecipeModel, RecipeGroupModel, ProductModel, ModelObject, PageModel, DragAndDrop, page, FlowInformation, LinkAlgorithm, ShareCurrentPage } from "./page.js";
import { voltageTier, GtVoltageTier, formatAmount } from "./utils.js";
import { ShowTooltip } from "./tooltip.js";
import { IconBox } from "./itemIcon.js";
import { ShowDropdown } from "./dropdown.js";

const linkAlgorithmNames: { [key in LinkAlgorithm]: string } = {
    [LinkAlgorithm.Match]: "",
    [LinkAlgorithm.Ignore]: "Ignore",
};

const tooltips: { [key: string]: {header: string, text: string} } = {
    "link": {header: "Links", text: "When some item has both production and consumption (or it is a required product), a link is created.\n\n\
    By default, the link will attempt to match production and consumption exactly.\n\n\
    If this is not desired, you can choose to ignore the link by clicking on it."}
};

type ActionHandler = (obj: ModelObject, event: Event, parent: ModelObject) => void;

export class RecipeList {
    private productItemsContainer: HTMLElement;
    private recipeItemsContainer: HTMLElement;
    private statusMessageElement: HTMLElement;
    private actionHandlers: Map<string, ActionHandler> = new Map();

    constructor() {
        this.productItemsContainer = document.querySelector(".product-items")!;
        this.recipeItemsContainer = document.querySelector(".recipe-list")!;
        this.statusMessageElement = document.querySelector('.status-message') as HTMLElement;
        this.setupActionHandlers();
        this.setupGlobalEventListeners();
        this.setupDragAndDrop();
        
        // Listen for project changes
        addProjectChangeListener(() => {
            this.renderStatus();
            this.renderProductList();
            this.updateRecipeList();
        });
    }

    private setupActionHandlers() {
        this.actionHandlers.set("delete_product", (obj, event, parent) => {
            if (obj instanceof ProductModel && parent instanceof PageModel && event.type === "click") {
                const index = parent.products.findIndex((p: ProductModel) => p.iid === obj.iid);
                if (index !== -1) {
                    parent.products.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("item_icon_click", (obj, event, parent) => {
            if (event instanceof MouseEvent && (event.type === "click" || event.type === "contextmenu") && event.target instanceof IconBox && obj instanceof RecipeGroupModel) {
                const goods = event.target.obj;

                const mode = event.type === "click" ? ShowNeiMode.Production : ShowNeiMode.Consumption;
                if (event.type === "contextmenu")
                    event.preventDefault();
                const callback: ShowNeiCallback = {
                    onSelectRecipe: (recipe: Recipe) => {
                        this.addRecipe(recipe, obj);
                    }
                };

                ShowNei(goods, mode, callback);
            }
        });

        this.actionHandlers.set("toggle_link_ignore", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "click" && event.target instanceof IconBox) {
                const goods = event.target.obj;
                if (goods instanceof Goods) {
                    const linkIgnore = obj.links[goods.id];
                    if (linkIgnore === LinkAlgorithm.Ignore) {
                        delete obj.links[goods.id];
                    } else {
                        obj.links[goods.id] = LinkAlgorithm.Ignore;
                    }
                }
                
                UpdateProject();
            }
        });

        this.actionHandlers.set("crafter_click", (obj, event, parent) => {
            if (obj instanceof RecipeModel && event.type === "click") {
                let options = [];
                let recipe = Repository.current.GetById<Recipe>(obj.recipeId);
                if (!recipe) return;
                let recipeType = recipe.recipeType;
                if (recipeType.singleblocks.length > 0)
                    options.push(recipeType.singleblocks[obj.voltageTier] ?? recipeType.defaultCrafter);
                options.push(...recipeType.multiblocks);
                ShowDropdown(event.target as HTMLElement, options, (selected: Goods) => {
                    obj.crafter = recipeType.multiblocks.includes(selected as Item) ? selected.id : undefined;
                    UpdateProject();
                });
            }
        });

        this.actionHandlers.set("update_amount", (obj, event) => {
            if (obj instanceof ProductModel && event.type === "change") {
                obj.amount = parseFloat((event.target as HTMLInputElement).value);
                UpdateProject();
            }
        });

        this.actionHandlers.set("add_recipe", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "click") {
                this.showNeiForRecipeSelection(obj);
            }
        });

        this.actionHandlers.set("add_group", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "click") {
                this.addGroup(obj);
            }
        });

        this.actionHandlers.set("toggle_collapse", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "click") {
                obj.collapsed = !obj.collapsed;
                UpdateProject(true);
            }
        });

        this.actionHandlers.set("add_product", (obj, event, parent) => {
            if (obj instanceof PageModel && event.type === "click") {
                this.showNeiForProductSelection();
            }
        });

        this.actionHandlers.set("delete_recipe", (obj, event, parent) => {
            if (obj instanceof RecipeModel && parent instanceof RecipeGroupModel && event.type === "click") {
                const index = parent.elements.findIndex(el => el.iid === obj.iid);
                if (index !== -1) {
                    parent.elements.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("delete_group", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && parent instanceof RecipeGroupModel && event.type === "click") {
                const index = parent.elements.findIndex(el => el.iid === obj.iid);
                if (index !== -1) {
                    parent.elements.splice(index, 1);
                    UpdateProject();
                }
            }
        });

        this.actionHandlers.set("update_group_name", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "change") {
                obj.name = (event.target as HTMLInputElement).value;
            }
        });

        this.actionHandlers.set("update_voltage_tier", (obj, event, parent) => {
            if (obj instanceof RecipeModel && event.type === "change") {
                obj.voltageTier = parseInt((event.target as HTMLSelectElement).value);
                UpdateProject();
            }
        });

        this.actionHandlers.set("share", (obj, event, parent) => {
            if (obj instanceof RecipeGroupModel && event.type === "click") {
                ShareCurrentPage();
            }
        });
    }

    private setupGlobalEventListeners() {
        let commonHandler = (e: Event) => {
            if (e.type === "contextmenu" && e instanceof MouseEvent && (e.ctrlKey || e.metaKey))
                return;
            const element = (e.target as HTMLElement).closest("[data-iid][data-action]") as HTMLElement;
            if (element) {
                const iid = parseInt(element.getAttribute("data-iid")!) || page.iid;
                const action = element.getAttribute("data-action")!;
                const result = GetByIid(iid);
                if (result) {
                    const handler = this.actionHandlers.get(action);
                    if (handler) {
                        handler(result.current, e, result.parent);
                    }
                }
            }
        }

        // Global event listener for all elements with iid and action
        document.addEventListener("click", commonHandler);
        document.addEventListener("change", commonHandler);
        document.addEventListener("contextmenu", commonHandler);

        // Tooltip handling
        document.addEventListener("mouseenter", (e) => {
            const element = (e.target as HTMLElement).closest("[data-tooltip]");
            if (element) {
                const tooltip = element.getAttribute("data-tooltip");
                if (tooltip) {
                    let formattedTooltip = tooltips[tooltip];
                    if (formattedTooltip) {
                        ShowTooltip(element as HTMLElement, {
                            header: formattedTooltip.header,
                            text: formattedTooltip.text
                        });
                    } else {
                        ShowTooltip(element as HTMLElement, { header: tooltip });
                    }
                }
            }
        }, true);
    }

    private setupDragAndDrop() {
        // Handle drag start
        document.addEventListener("dragstart", (e) => {
            const draggable = (e.target as HTMLElement)?.closest("[draggable]");
            if (draggable) {
                draggable.classList.add("dragging");
                e.dataTransfer?.setData("text/plain", draggable.getAttribute("data-iid") || "");
            }
        });

        // Handle drag end
        document.addEventListener("dragend", (e) => {
            const draggable = (e.target as HTMLElement)?.closest("[draggable]");
            if (draggable) {
                draggable.classList.remove("dragging");
            }
        });

        // Handle drag over
        document.addEventListener("dragover", (e) => {
            e.preventDefault();
            const dropZone = (e.target as HTMLElement)?.closest(".recipe-item, .recipe-group");
            if (dropZone) {
                dropZone.classList.add("drag-over");
            }
        });

        // Handle drag leave
        document.addEventListener("dragleave", (e) => {
            const dropZone = (e.target as HTMLElement)?.closest(".recipe-item, .recipe-group");
            if (dropZone) {
                dropZone.classList.remove("drag-over");
            }
        });

        // Handle drop
        document.addEventListener("drop", (e) => {
            e.preventDefault();
            const dropZone = (e.target as HTMLElement)?.closest(".recipe-item, .recipe-group");
            if (!dropZone) return;
            
            dropZone.classList.remove("drag-over");
            const draggedIid = parseInt(e.dataTransfer?.getData("text/plain") || "0");
            const targetIid = parseInt(dropZone.getAttribute("data-iid") || "0");
            
            if (draggedIid && targetIid) {
                DragAndDrop(draggedIid, targetIid);
            }
        });
    }

    private showNeiForProductSelection() {
        const callback: ShowNeiCallback = {
            onSelectGoods: (goods: Goods) => {
                this.addProduct(goods, 1);
            },
        };

        ShowNei(null, ShowNeiMode.Production, callback);
    }

    private showNeiForRecipeSelection(targetGroup: RecipeGroupModel) {
        const callback: ShowNeiCallback = {
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
        targetGroup.elements.push(new RecipeModel({ recipeId: recipe.id, voltageTier: recipe.gtRecipe?.voltageTier ?? 0 }));
        UpdateProject();
    }

    private addGroup(targetGroup: RecipeGroupModel) {
        targetGroup.elements.push(new RecipeGroupModel());
        UpdateProject();
    }

    private renderIoInfo(flow: FlowInformation, group: RecipeGroupModel): string {
        const renderFlowItems = (items: {[key:string]:number}, group: RecipeGroupModel) => {
            const sortedFlow = Object.entries(items).sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));
            return sortedFlow.map(([goodsId, amount]) => {
                const amountText = formatAmount(amount);
                return `
                    <item-icon data-id="${goodsId}" class="flow-item" data-amount="${amountText}" data-action="item_icon_click" data-iid="${group.iid}"></item-icon>
                `;
            }).join('');
        };

        const renderEnergyItems = (energy: {[key:number]:number}) => {
            let out = "";
            for (const [tier, amount] of Object.entries(energy)) {
                const tierInfo = voltageTier[parseInt(tier)];
                out += `${tierInfo.name}: ${Math.ceil(100 * amount/tierInfo.voltage)/100}A<br>`;
            }
            return out;
        }

        return `
            <td class="text-small white-text">
                ${renderEnergyItems(flow.energy)}
            </td>
            <td>
                <div class="io-items">
                    ${renderFlowItems(flow.input, group)}
                </div>
            </td>
            <td>
                <div class="io-items">
                    ${renderFlowItems(flow.output, group)}
                </div>
            </td>
        `;
    }

    private renderRecipeShortInfo(recipe: Recipe | null, recipeModel: RecipeModel, group: RecipeGroupModel): string {
        if (recipe === null) {
            return `
                <td colspan="2">Unknown recipe</td>
            `;
        }
        let crafter:Item | null = null;
        if (recipeModel.crafter)
            crafter = Repository.current.GetById(recipeModel.crafter) as Item;
        if (!crafter) {
            crafter = recipe.recipeType.singleblocks[recipeModel.voltageTier] ?? recipe.recipeType.defaultCrafter;
        }
        
        let gtRecipe = recipe.gtRecipe;
        let shortInfoContent = crafter?.name ?? recipe.recipeType.name;
        let machineCountsText = "";
        if (gtRecipe && gtRecipe.durationTicks > 0) {
            const minTier = gtRecipe.voltageTier;
            const maxTier = voltageTier.length - 1;
            const options = voltageTier
                .slice(minTier, maxTier + 1)
                .map((tier: GtVoltageTier, index: number) => `<option value="${minTier + index}" ${minTier + index === recipeModel.voltageTier ? 'selected' : ''}>${tier.name}</option>`)
                .join('');
            let machineCounts = recipeModel.recipesPerMinute * gtRecipe.durationMinutes / recipeModel.overclockFactor;
            machineCountsText = `${Math.ceil(machineCounts * 100) / 100}`;

            if (recipeModel.parallels > 1 || recipeModel.overclockTiers > 0) {
                let info = [];
                if (recipeModel.parallels > 1)
                    info.push(`${recipeModel.parallels} parallels`);
                if (recipeModel.overclockTiers > 0)
                    info.push(`${recipeModel.perfectOverclock ? "Perfect OC" : "OC"} x${recipeModel.overclockTiers}`);
                shortInfoContent += `<span class="text-small white-text">(${info.join(", ")})</span>`;
            }

            shortInfoContent = `
                <select class="voltage-tier-select" data-iid="${recipeModel.iid}" data-action="update_voltage_tier">
                    ${options}
                </select>
                ${shortInfoContent}
            `;
        }

        let iconCell = `<td><div class="icon-container"><item-icon data-id="${crafter.id}" data-action="crafter_click" data-iid="${recipeModel.iid}" data-amount="${machineCountsText}"></item-icon></div></td>`;

        let shortInfoCell = `<td><div class="short-info">${shortInfoContent}</div></td>`;
        return iconCell + shortInfoCell;
    }

    private renderRecipe(recipeModel: RecipeModel, group: RecipeGroupModel, level: number = 0): string {
        let recipe = Repository.current.GetById<Recipe>(recipeModel.recipeId);
        return `
            <tr class="recipe-item" data-iid="${recipeModel.iid}" draggable="true" style="--nest-level: ${level}">
                ${this.renderRecipeShortInfo(recipe, recipeModel, group)}
                ${this.renderIoInfo(recipeModel.flow, group)}
                <td>
                    <div class="icon-container">
                        <button class="delete-btn" data-iid="${recipeModel.iid}" data-action="delete_recipe">x</button>
                    </div>
                </td>
            </tr>
        `;
    }

    private renderCollapsedGroup(group: RecipeGroupModel, parentGroup: RecipeGroupModel, level: number = 0): string {
        return `
            <tr class="recipe-group collapsed" data-iid="${group.iid}" draggable="true" style="--nest-level: ${level}">
                <td>
                    <div class="icon-container">
                        <button class="expand-btn icon-button" data-iid="${group.iid}" data-action="toggle_collapse"></button>
                    </div>
                </td>
                <td>
                    <div class="short-info">
                        <div class="group-name">${group.name}</div>
                    </div>
                </td>
                ${this.renderIoInfo(group.flow, parentGroup)}
                <td>
                    <div class="icon-container">
                        <button class="delete-btn" data-iid="${group.iid}" data-action="delete_group">x</button>
                    </div>
                </td>
            </tr>
        `;
    }

    private renderExpandedGroup(group: RecipeGroupModel, level: number = 0): string {
        return `
            <tr class="recipe-group expanded" data-iid="${group.iid}">
                <td colspan="6" class="expanded-group-cell nested-level-${level%2}">
                    <table class="recipe-table">
                        <tr>
                            <th class="icon-cell">
                                <div class="icon-container">
                                    <button class="collapse-btn icon-button" data-iid="${group.iid}" data-action="toggle_collapse"></button>
                                </div>
                            </th>
                            <th class="short-info-cell">
                                <div class="short-info">
                                    <input type="text" class="group-name-input" value="${group.name}" data-iid="${group.iid}" data-action="update_group_name" placeholder="Group name">
                                </div>
                            </th>
                            <th class="energy-cell">POWER</th>
                            <th class="inputs-cell">INPUTS/min</th>
                            <th class="outputs-cell">OUTPUTS/min</th>
                            <th class="action-cell">
                                <div class="icon-container">
                                    <button class="delete-btn" data-iid="${group.iid}" data-action="delete_group">x</button>
                                </div>
                            </th>
                        </tr>
                        ${this.renderLinks(group.actualLinks, group)}
                        ${group.elements.map(entry => {
                            if (entry instanceof RecipeModel) {
                                return this.renderRecipe(entry, group, level + 1);
                            } else if (entry instanceof RecipeGroupModel) {
                                return entry.collapsed ? 
                                    this.renderCollapsedGroup(entry, group, level + 1) : 
                                    this.renderExpandedGroup(entry, level + 1);
                            }
                            return '';
                        }).join("")}
                        ${this.renderButtons(group)}
                    </table>
                </td>
            </tr>
        `;
    }

    private renderRootGroup(group: RecipeGroupModel): string {
        return `
            <table class="recipe-table root-group" data-iid="${group.iid}">
                <thead>
                    <tr>
                        <th class="icon-cell"></th>
                        <th class="short-info-cell"></th>
                        <th class="energy-cell">POWER</th>
                        <th class="inputs-cell">INPUTS/min</th>
                        <th class="outputs-cell">OUTPUTS/min</th>
                        <th class="action-cell"></th>
                    </tr>
                    <tr>
                        <td></td>
                        <td>Grand total:</td>
                        ${this.renderIoInfo(group.flow, group)}
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    ${this.renderLinks(group.actualLinks, group)}
                    ${group.elements.map(entry => {
                        if (entry instanceof RecipeModel) {
                            return this.renderRecipe(entry, group, 1);
                        } else if (entry instanceof RecipeGroupModel) {
                            return entry.collapsed ? 
                                this.renderCollapsedGroup(entry, group, 1) : 
                                this.renderExpandedGroup(entry, 1);
                        }
                        return '';
                    }).join("")}
                    ${this.renderButtons(group, true)}
                </tbody>
            </table>
        `;
    }

    private renderLinks(links: {[key:string]:LinkAlgorithm}, group: RecipeGroupModel): string {
        let goodsIds = Object.keys(links).sort();
        if (goodsIds.length === 0) return '';
        
        return `
            <tr class="group-links">
                <td colspan="6">
                    <div class="hgroup">
                        <span class="links-label" data-tooltip="link">Links: (?)</span>
                    </div>
                    <div class="links-grid">
                        ${goodsIds.map(goodsId => {
                            const goods = Repository.current.GetById<Goods>(goodsId);
                            const algorithm = links[goodsId];
                            let overText = algorithm === LinkAlgorithm.Match ? "" : ` data-amount="${linkAlgorithmNames[algorithm]}"`;
                            return goods ? `<item-icon data-id="${goodsId}"${overText} data-action="toggle_link_ignore" data-iid="${group.iid}"></item-icon>` : '';
                        }).join('')}
                    </div>
                </td>
            </tr>
        `;
    }

    private renderButtons(group: RecipeGroupModel, renderShareButton: boolean = false): string {
        return `
            <tr class="group-links">
                <td colspan="6">
                    <div class="group-buttons">
                        <button class="add-recipe-btn" data-iid="${group.iid}" data-action="add_recipe">Add Recipe</button>
                        <button class="add-group-btn" data-iid="${group.iid}" data-action="add_group">Add Group</button>
                        ${renderShareButton ? `<button class="share-btn" data-iid="${group.iid}" data-action="share">Share</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    private renderStatus() {
        let statusMessage = "";
        let statusClass = "";
        if (page.status === "infeasible") {
            statusMessage = "Infeasible - There is no solution - You probably need to ignore some links";
        } else if (page.status === "unbounded") {
            statusMessage = "Unbounded - Some items can be produced infinitely";
        } else if (page.status === "solved") {
            statusMessage = `"${page.name}" is solved`;
            statusClass = "solved";
        }

        if (this.statusMessageElement) {
            if (statusMessage) {
                this.statusMessageElement.textContent = statusMessage;
                this.statusMessageElement.className = `status-message ${statusClass}`;
            } else {
                this.statusMessageElement.style.display = 'none';
            }
        }
    }

    private renderProductList() {
        const products = page.products
            .filter(product => product instanceof ProductModel && product.amount !== 0)
            .sort((a, b) => (b as ProductModel).amount - (a as ProductModel).amount);

        this.productItemsContainer.innerHTML = `
            ${products.map(product => {
                if (!(product instanceof ProductModel)) return '';
                const obj = Repository.current.GetById(product.goodsId);
                if (!obj || !(obj instanceof Goods)) return '';
                const goods = obj as Goods;
                return `
                    <div class="product-item">
                        <item-icon data-id="${goods.id}" data-action="item_icon_click" data-iid="${page.rootGroup.iid}"></item-icon>
                        <input type="number" class="amount" value="${product.amount}" min="-999999" step="0.1" data-iid="${product.iid}" data-action="update_amount">
                        <span class="amount-unit">/min</span>
                        ${goods.name}
                        <button class="delete-btn" data-iid="${product.iid}" data-action="delete_product">x</button>
                    </div>
                `;
            }).join("")}
            <button class="add-product-btn" data-action="add_product" data-iid="0">Add Product</button>
        `;
    }

    private updateRecipeList() {
        this.recipeItemsContainer.innerHTML = this.renderRootGroup(page.rootGroup);
    }
}

// Initialize the recipe list
new RecipeList();