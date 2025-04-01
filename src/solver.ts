import { Model, Solution } from "./types/javascript-lp-solver.js";
import { PageModel, RecipeGroupModel, RecipeModel, ProductModel, FlowInformation, LinkAlgorithm } from './project.js';
import { Goods, Item, OreDict, Recipe, RecipeIoType, Repository } from "./data/repository.js";

type LinkCollection = {
    output: {[key:string]:{[key:string]:number}},
    input: {[key:string]:{[key:string]:number}},
    inputOreDict: {[key:string]:{[key:string]:number}},
}

function MatchVariablesToConstraints(model:Model, name:string, variableList: {[key:string]:number}):void
{
    for (const key in variableList) {
        model.variables[key][name] = variableList[key];
    }
}

function CreateLinkByAlgorithm(model:Model, algorithm:LinkAlgorithm, group:RecipeGroupModel, goodsId:string, collectionKey:string,
    collection:{[key:string]:{[key:string]:number}}, matchedOutputs:{[key:string]:boolean})
{
    var linkName = `link_${group.iid}_${goodsId}`;
    MatchVariablesToConstraints(model, linkName, collection[collectionKey]);
    let amount = collection[collectionKey]["_amount"] || 0;
    matchedOutputs[goodsId] = true;
    delete collection[collectionKey];
    group.actualLinks[goodsId] = algorithm;

    switch (algorithm) {
        case LinkAlgorithm.AtLeast:
            model.variables[linkName] = {min:amount};
        case LinkAlgorithm.AtMost:
            model.variables[linkName] = {max:amount};
        default:
            model.variables[linkName] = {equal:amount};
    }
}

function CreateAndMatchLinks(group:RecipeGroupModel, model:Model, collection:LinkCollection)
{
    for (const child of group.elements) {
        if (child instanceof RecipeModel) {
            let recipe = Repository.current.GetById(child.recipeId) as Recipe;
            let varName = `recipe_${child.iid}`;
            model.variables[varName] = {"obj":1};
            for (const item of recipe.items) {
                if (item.type == RecipeIoType.ItemOutput || item.type == RecipeIoType.FluidOutput) {
                    collection.output[item.goods.id] = collection.output[item.goods.id] || {};
                    collection.output[item.goods.id][varName] = (collection.output[item.goods.id][varName] || 0) - item.amount;
                } else if (item.type == RecipeIoType.ItemInput || item.type == RecipeIoType.FluidInput) {
                    if (item.amount === 0) continue;
                    collection.input[item.goods.id] = collection.input[item.goods.id] || {};
                    collection.input[item.goods.id][varName] = (collection.input[item.goods.id][varName] || 0) + item.amount;
                } else if (item.type == RecipeIoType.OreDictInput) {
                    if (item.amount === 0) continue;
                    collection.inputOreDict[item.goods.id] = collection.inputOreDict[item.goods.id] || {};
                    collection.inputOreDict[item.goods.id][varName] = (collection.inputOreDict[item.goods.id][varName] || 0) + item.amount;
                }
            }
        } else if (child instanceof RecipeGroupModel) {
            let childCollection:LinkCollection = {output: {}, input: {}, inputOreDict: {}};
            CreateAndMatchLinks(child, model, childCollection);
            for (const key in childCollection.output) {
                collection.output[key] = {...collection.output[key], ...childCollection.output[key]};
            }
            for (const key in childCollection.input) {
                collection.input[key] = {...collection.input[key], ...childCollection.input[key]};
            }
            for (const key in childCollection.inputOreDict) {
                collection.inputOreDict[key] = {...collection.inputOreDict[key], ...childCollection.inputOreDict[key]};
            }
        }
    }

    let matchedOutputs: {[key:string]:boolean} = {};
    group.actualLinks = {};

    for (const key of Object.keys(collection.inputOreDict)) {
        var oreDict = Repository.current.GetById<OreDict>(key);
        for (const itemId of oreDict.items) {
            var item = Repository.current.GetObject(itemId, Item);
            let algorithm = group.links[item.id] || LinkAlgorithm.Ignore;
            if (algorithm === LinkAlgorithm.Ignore || collection.output[item.id] === undefined)
                continue;

            CreateLinkByAlgorithm(model, algorithm, group, item.id, key, collection.inputOreDict, matchedOutputs);
            break
        }
    }

    for (const key of Object.keys(collection.input)) {
        var algorithm = group.links[key] || LinkAlgorithm.Ignore;
        if (algorithm === LinkAlgorithm.Ignore || collection.output[key] === undefined)
            continue;

        CreateLinkByAlgorithm(model, algorithm, group, key, key, collection.input, matchedOutputs);
    }

    for (const key in matchedOutputs) {
        var linkName = `link_${group.iid}_${key}`;
        MatchVariablesToConstraints(model, linkName, collection.output[key]);
        delete collection.output[key];
    }

    return collection;
}

function ApplySolutionRecipe(recipeModel:RecipeModel, solution:Solution):void
{
    let flow:FlowInformation = {input: {}, output: {}, energy: {}};
    recipeModel.flow = flow;
    let name = `recipe_${recipeModel.iid}`;
    let recipe = Repository.current.GetById(recipeModel.recipeId) as Recipe;
    let solutionValue = (solution[name] || 0) as number;
    recipeModel.recipesPerMinute = solutionValue;
    recipeModel.overclockFactor = 1;
    for (const item of recipe.items) {
        var goods:Goods | null = null;
        if (item.type == RecipeIoType.OreDictInput)
            goods = recipeModel.selectedOreDicts[item.goods.id];
        else goods = item.goods as Goods;

        var isProduction = item.type == RecipeIoType.FluidOutput || item.type == RecipeIoType.ItemOutput;
        var element = isProduction ? flow.output : flow.input;
        element[goods.id] = (element[goods.id] || 0) + item.amount * solutionValue;
    }

    let gtRecipe = recipe.gtRecipe;
    if (gtRecipe && gtRecipe.durationTicks > 0) {
        let overclockTiers = Math.max(0, recipeModel.voltageTier - gtRecipe.voltageTier);
        let overclock = Math.pow(2, overclockTiers);
        recipeModel.overclockFactor = overclock;
        flow.energy[recipeModel.voltageTier] = gtRecipe.durationMinutes * gtRecipe.voltage * solutionValue * overclock;
    }
}

function AppendFlow(flow:FlowInformation, source:FlowInformation):void
{
    for (const key in source.input) {
        flow.input[key] = (flow.input[key] || 0) + source.input[key];
    }
    for (const key in source.output) {
        flow.output[key] = (flow.output[key] || 0) + source.output[key];
    }
    for (const key in source.energy) {
        flow.energy[key] = (flow.energy[key] || 0) + source.energy[key];
    }
}

function ApplySolutionGroup(group:RecipeGroupModel, solution:Solution, model:Model):void
{
    for (const child of group.elements) {
        if (child instanceof RecipeModel)
            ApplySolutionRecipe(child, solution);
        else if (child instanceof RecipeGroupModel)
            ApplySolutionGroup(child, solution, model);
    }

    let flow:FlowInformation = {input: {}, output: {}, energy: {}};
    group.flow = flow;
    for (const child of group.elements) {
        AppendFlow(group.flow, child.flow);
    }
    for (const link in group.links) {
        let name = `link_${group.iid}_${link}`;
        if (model.constraints[name]) {
            delete flow.input[link];
            delete flow.output[link];
        }
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
    let collection:LinkCollection = {output: {}, input: {}, inputOreDict: {}};
    for (const product of page.products) {
        if (product.amount > 0) {
            collection.input[product.goodsId] = {"_amount": product.amount};
        } else {
            collection.output[product.goodsId] = {"_amount": -product.amount};
        }
    }
    CreateAndMatchLinks(page.rootGroup, model, collection);
    CleanupModel(model);

    let solution = window.solver.Solve(model);
    console.log("Solve solution",solution);
    if (solution.feasible)
        ApplySolutionGroup(page.rootGroup, solution, model);
}
