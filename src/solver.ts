import { Model, Solution } from "./types/javascript-lp-solver.js";
import { PageModel, RecipeGroupModel, RecipeModel, ProductModel } from './project.js';
import { Goods, Item, OreDict, Recipe, RecipeIoType, Repository } from "./data/repository.js";

type Capture = {[id:string]:string};

function CollectVariables(group:RecipeGroupModel, model:Model, capture:Capture, products:ProductModel[] | null):void
{
    capture = {...capture};

    for (const link of group.links) {
        let name = `link_${group.iid}_${link}`;
        model.constraints[name] = {equal:0};
        capture[link] = name;
    }

    if (products) {
        for (const product of products) {
            let name = `link_${group.iid}_${product.goodsId}`;
            model.constraints[name] = {equal:-product.amount};
            capture[product.goodsId] = name;
        }
    }

    for (const child of group.elements) {
        if (child instanceof RecipeModel) {
            let coefficients: {[key:string]:number} = {"obj":1};
            let name = `recipe_${child.iid}`;
            model.variables[name] = coefficients;
            let recipe = Repository.current.GetById(child.recipeId) as Recipe;
            for (const item of recipe.items) {
                var goods:Goods | null = null;
                if (item.type == RecipeIoType.OreDictInput) {
                    var oreDict = item.goods as OreDict;
                    goods = child.selectedOreDicts[oreDict.id]
                    if (!goods) {
                        var items = oreDict.items;
                        var selectedItem = Repository.current.GetObject(items[0], Item);
                        for (const variant of items) {
                            var variantItem = Repository.current.GetObject(variant, Item);
                            if (capture[variantItem.id]) {
                                selectedItem = variantItem;
                                break;
                            }
                        }
                        child.selectedOreDicts[oreDict.id] = selectedItem;
                        goods = selectedItem;
                    }
                } else {
                    goods = item.goods as Goods;
                }

                var captureVar = capture[goods.id];
                if (!captureVar) continue;
                var isProduction = item.type == RecipeIoType.FluidOutput || item.type == RecipeIoType.ItemOutput;
                coefficients[captureVar] = isProduction ? -item.amount : item.amount;
            }
        } else if (child instanceof RecipeGroupModel) {
            CollectVariables(child, model, capture, null);
        }
    }
}

function ApplySolutionRecipe(recipeModel:RecipeModel, solution:Solution):void
{
    recipeModel.flow = {};
    let name = `recipe_${recipeModel.iid}`;
    let recipe = Repository.current.GetById(recipeModel.recipeId) as Recipe;
    let solutionValue = (solution[name] || 0) as number;
    recipeModel.recipesPerMinute = solutionValue;
    for (const item of recipe.items) {
        var goods:Goods | null = null;
        if (item.type == RecipeIoType.OreDictInput)
            goods = recipeModel.selectedOreDicts[item.goods.id];
        else goods = item.goods as Goods;

        var isProduction = item.type == RecipeIoType.FluidOutput || item.type == RecipeIoType.ItemOutput;
        recipeModel.flow[goods.id] = (isProduction ? -item.amount : item.amount) * solutionValue;
    }
}

function AppendFlow(flow:{[key:string]:number}, source:{[key:string]:number}):void
{
    for (const key in source) {
        flow[key] = (flow[key] || 0) + source[key];
    }
}

function ApplySolutionGroup(group:RecipeGroupModel, solution:Solution):void
{
    for (const child of group.elements) {
        if (child instanceof RecipeModel)
            ApplySolutionRecipe(child, solution);
        else if (child instanceof RecipeGroupModel)
            ApplySolutionGroup(child, solution);
    }

    group.flow = {};
    for (const child of group.elements) {
        AppendFlow(group.flow, child.flow);
    }
    for (const link of group.links) {
        let name = `link_${group.iid}_${link}`;
        if (solution[name] === 0)
            delete group.flow[link];
    }
}

function CleanupModel(model:Model):void
{
    let positives: {[key:string]:number} = {};
    let negatives: {[key:string]:number} = {};
    for (const key in model.variables) {
        for (const subKey in model.variables[key]) {
            let value = model.variables[key][subKey];
            if (value > 0)
                positives[subKey] = value;
            else if (value < 0)
                negatives[subKey] = value;
        }
    }

    for (const key in model.constraints) {
        let equal = model.constraints[key].equal as number;
        let hasPositive = positives[key] || equal < 0;
        let hasNegative = negatives[key] || equal > 0;
        if (!hasPositive || !hasNegative) {
            delete model.constraints[key];
        }
    }
}

export function SolvePage(page:PageModel):void
{
    let model:Model = {
        optimize: "obj",
        opType: "min",
        constraints: {},
        variables: {},
    }

    console.log("Solve model",model);
    CollectVariables(page.rootGroup, model, {}, page.products);
    CleanupModel(model);

    let solution = window.solver.Solve(model);
    console.log("Solve solution",solution);
    if (solution.feasible)
        ApplySolutionGroup(page.rootGroup, solution);
}
