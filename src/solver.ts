import { Model, Solution } from "./types/javascript-lp-solver.js";
import { PageModel, RecipeGroupModel, RecipeModel, ProductModel, FlowInformation, LinkAlgorithm } from './page.js';
import { Goods, Item, OreDict, Recipe, RecipeIoType, RecipeObject, Repository } from "./repository.js";
import { defaultMachine, MachineCoefficient, machines } from "./machines.js";
import { voltageTier } from "./utils.js";

type LinkCollection = {
    output: {[key:string]:{[key:string]:number}},
    input: {[key:string]:{[key:string]:number}},
    inputOreDict: {[key:string]:{[key:string]:number}},
    inputOreDictRecipe: {[key:string]:RecipeModel[]},
}

function MatchVariablesToConstraints(model:Model, name:string, variableList: {[key:string]:number}):void
{
    for (const key in variableList) {
        if (key === "_amount") continue;
        model.variables[key][name] = (model.variables[key][name] || 0) + variableList[key];
    }
}

function CreateLinkByAlgorithm(model:Model, algorithm:LinkAlgorithm, group:RecipeGroupModel, goodsId:string, collectionKey:string,
    collection:{[key:string]:{[key:string]:number}}, matchedOutputs:{[key:string]:boolean}, outputAmount:{[key:string]:number})
{
    var linkName = `link_${group.iid}_${goodsId}`;
    MatchVariablesToConstraints(model, linkName, collection[collectionKey]);
    let amount = collection[collectionKey]["_amount"] || -outputAmount["_amount"] || 0;
    matchedOutputs[goodsId] = true;
    delete collection[collectionKey];
    group.actualLinks[goodsId] = algorithm;
    model.constraints[linkName] = {equal:amount};
}

function CreateAndMatchLinks(group:RecipeGroupModel, model:Model, collection:LinkCollection)
{
    for (const child of group.elements) {
        if (child instanceof RecipeModel) {
            let recipe = Repository.current.GetById(child.recipeId) as Recipe;
            let varName = `recipe_${child.iid}`;
            model.variables[varName] = {"obj":1};
            for (const slot of recipe.items) {
                const goods = slot.goods;
                let matchKey = goods.id;
                let amount = slot.amount * slot.probability;
                if (goods instanceof Item && goods.fluid) {
                    matchKey = goods.fluid.id;
                    amount *= goods.fluidAmount;
                }

                if (slot.type == RecipeIoType.ItemOutput || slot.type == RecipeIoType.FluidOutput) {
                    let output = collection.output[matchKey] ||= {};
                    output[varName] = (output[varName] || 0) - amount;
                } else if (slot.type == RecipeIoType.ItemInput || slot.type == RecipeIoType.FluidInput) {
                    if (slot.amount === 0) continue;
                    let input = collection.input[matchKey] ||= {};
                    input[varName] = (input[varName] || 0) + amount;
                } else if (slot.type == RecipeIoType.OreDictInput) {
                    if (slot.amount === 0) continue;
                    let inputOreDict = collection.inputOreDict[matchKey] ||= {};
                    inputOreDict[varName] = (inputOreDict[varName] || 0) + amount;
                    let inputOreDictRecipe = collection.inputOreDictRecipe[matchKey] ||= [];
                    inputOreDictRecipe.push(child);
                }
            }
        } else if (child instanceof RecipeGroupModel) {
            let childCollection:LinkCollection = {output: {}, input: {}, inputOreDict: {}, inputOreDictRecipe: {}};
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
            for (const key in childCollection.inputOreDictRecipe) {
                collection.inputOreDictRecipe[key] = [...collection.inputOreDictRecipe[key] || [], ...childCollection.inputOreDictRecipe[key]];
            }
        }
    }

    console.log("Raw collection",collection);

    let matchedOutputs: {[key:string]:boolean} = {};
    group.actualLinks = {...group.links};

    for (const key of Object.keys(collection.inputOreDict)) {
        var oreDict = Repository.current.GetById<OreDict>(key)!;
        for (const item of oreDict.items) {
            let algorithm = group.links[item.id] || LinkAlgorithm.Match;
            if (collection.output[item.id] === undefined)
                continue;
            // Despite the fact that we are ignoring the link, we still need to select the ore dict item to have the same item in production and consumption
            for (const recipe of collection.inputOreDictRecipe[key])
                recipe.selectedOreDicts[key] = item;
            if (algorithm === LinkAlgorithm.Ignore)
                continue;

            CreateLinkByAlgorithm(model, algorithm, group, item.id, key, collection.inputOreDict, matchedOutputs, collection.output[item.id]);
            break
        }
    }

    for (const key of Object.keys(collection.input)) {
        var algorithm = group.links[key] || LinkAlgorithm.Match;
        if (algorithm === LinkAlgorithm.Ignore || collection.output[key] === undefined)
            continue;

        CreateLinkByAlgorithm(model, algorithm, group, key, key, collection.input, matchedOutputs, collection.output[key]);
    }

    for (const key in matchedOutputs) {
        var linkName = `link_${group.iid}_${key}`;
        MatchVariablesToConstraints(model, linkName, collection.output[key]);
        delete collection.output[key];
    }

    return collection;
}

function GetParameter(coefficient: MachineCoefficient, voltageTier: number): number {
    if (typeof coefficient === "number")
        return coefficient;
    return coefficient(voltageTier, 0);
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
        var goods:RecipeObject = item.goods;
        if (item.type == RecipeIoType.OreDictInput && recipeModel.selectedOreDicts[item.goods.id])
            goods = recipeModel.selectedOreDicts[item.goods.id];

        var isProduction = item.type == RecipeIoType.FluidOutput || item.type == RecipeIoType.ItemOutput;
        let amount = item.amount * item.probability * solutionValue;
        if (goods instanceof Item && goods.fluid) {
            amount *= goods.fluidAmount;
            goods = goods.fluid;
        }
        var element = isProduction ? flow.output : flow.input;
        element[goods.id] = (element[goods.id] || 0) + amount;
    }

    let gtRecipe = recipe.gtRecipe;
    if (gtRecipe && gtRecipe.durationTicks > 0) {
        let crafter = recipeModel.crafter ? Repository.current.GetById(recipeModel.crafter) as Item : null;
        let machineInfo = crafter ? machines[crafter.name] || defaultMachine : defaultMachine;
        let actualVoltage = voltageTier[recipeModel.voltageTier].voltage;
        let machineParallels = Math.max(1, GetParameter(machineInfo.parallels, recipeModel.voltageTier));
        let maxParallels = Math.floor(actualVoltage / gtRecipe.voltage);
        let parallels = Math.min(maxParallels, machineParallels);
        let overclockTiers = Math.min(recipeModel.voltageTier - gtRecipe.voltageTier, Math.floor(Math.log2(maxParallels / parallels) / 2));
        let overclockSpeed = 1;
        let overclockPower = 1;
        if (overclockTiers > 0) {
            if (machineInfo.perfectOverclock) {
                overclockSpeed = Math.pow(4, overclockTiers);
            } else {
                overclockSpeed = overclockPower = Math.pow(2, overclockTiers);
            }
        }
        let energyModifier = GetParameter(machineInfo.power, recipeModel.voltageTier);
        let speedModifier = GetParameter(machineInfo.speed, recipeModel.voltageTier);
        //console.log({machineParallels, maxParallels, parallels, overclockTiers, overclockSpeed, overclockPower, energyModifier, speedModifier});
        recipeModel.overclockFactor = overclockSpeed * speedModifier * parallels;
        recipeModel.parallels = parallels;
        recipeModel.overclockTiers = overclockTiers;
        recipeModel.perfectOverclock = machineInfo.perfectOverclock;
        flow.energy[recipeModel.voltageTier] = gtRecipe.durationMinutes * gtRecipe.voltage * solutionValue * overclockPower * energyModifier;
    }
}

function AppendFlow(flow:FlowInformation, source:FlowInformation):void
{
    for (const key in source.input) {
        if (source.input[key] === 0) continue;
        flow.input[key] = (flow.input[key] || 0) + source.input[key];
    }
    for (const key in source.output) {
        if (source.output[key] === 0) continue;
        flow.output[key] = (flow.output[key] || 0) + source.output[key];
    }
    for (const key in source.energy) {
        if (source.energy[key] === 0) continue;
        flow.energy[key] = (flow.energy[key] || 0) + source.energy[key];
    }
}

function ApplySolutionGroup(group:RecipeGroupModel, solution:Solution, model:Model, feasible:boolean):void
{
    for (const child of group.elements) {
        if (child instanceof RecipeModel)
            ApplySolutionRecipe(child, solution);
        else if (child instanceof RecipeGroupModel)
            ApplySolutionGroup(child, solution, model, feasible);
    }

    let flow:FlowInformation = {input: {}, output: {}, energy: {}};
    group.flow = flow;
    for (const child of group.elements) {
        AppendFlow(group.flow, child.flow);
    }
    for (const link in group.actualLinks) {
        let delta = (flow.input[link] || 0) - (flow.output[link] || 0);
        if (delta > 0.01) {
            flow.input[link] = delta;
            delete flow.output[link];
        } else if (delta < -0.01) {
            flow.output[link] = -delta;
            delete flow.input[link];
        } else {
            delete flow.input[link];
            delete flow.output[link];
        }
    }
}

export function SolvePage(page:PageModel):void
{
    try {
        let model:Model = {
            optimize: "obj",
            opType: "min",
            constraints: {},
            variables: {},
        }

        let collection:LinkCollection = {output: {}, input: {}, inputOreDict: {}, inputOreDictRecipe: {}};
        for (const product of page.products) {
            if (product.amount > 0) {
                collection.input[product.goodsId] = {"_amount": -product.amount};
            } else {
                collection.output[product.goodsId] = {"_amount": product.amount};
            }
        }
        CreateAndMatchLinks(page.rootGroup, model, collection);
        console.log("Solve model",model);

        let solution = window.solver.Solve(model);
        console.log("Solve solution",solution);
        page.status = solution.feasible ? solution.bounded ? "solved" : "unbounded" : "infeasible";
        ApplySolutionGroup(page.rootGroup, solution, model, solution.feasible);
    } catch (error) {
        console.error("Error solving page",error);
    }
}
