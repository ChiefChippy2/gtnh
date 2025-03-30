import { Solve, Model, Solution } from "javascript-lp-solver";
import { ModelObject, ModelObjectVisitor, PageModel, RecipeGroupModel, RecipeModel, ProductModel } from './project';
import { Goods, Item, OreDict, Recipe, RecipeIoType, Repository } from "./data/repository";

type Capture = {[id:string]:string};

function CollectVariables(group:RecipeGroupModel, model:Model, capture:Capture, products:ProductModel[] | null):void
{
    capture = {...capture};

    for (const link of group.links) {
        let name = `link_${group.iid}_${link}`;
        model.variables[name] = {};
        model.constraints[name] = {equal:0};
        capture[link] = name;
    }

    if (products) {
        for (const product of products) {
            let name = `link_${group.iid}_${product.goodsId}`;
            model.variables[name] = {};
            model.constraints[name] = {equal:-product.amount};
            capture[product.goodsId] = name;
        }
    }

    for (const child of group.elements) {
        if (child instanceof RecipeModel) {
            let name = `var_${child.iid}`;
            model.variables["obj"][name] = 1;
            model.variables[name] = {};
            model.constraints[name] = {min:0};
            let recipe = Repository.current.GetById(child.recipeId) as Recipe;
            for (const item of recipe.items) {
                var goods:Goods | null = null;
                if (item.type == RecipeIoType.OreDictInput) {
                    var items = (item.goods as OreDict).items;
                    goods = Repository.current.GetObject(items[0], Item);
                    for (const variant of items) {
                        var variantItem = Repository.current.GetObject(variant, Item);
                        if (capture[variantItem.id]) {
                            goods = variantItem;
                            break;
                        }
                    }
                } else {
                    goods = item.goods as Goods;
                }

                var captureVar = capture[goods.id];
                if (!captureVar) continue;
                var isProduction = item.type == RecipeIoType.FluidOutput || item.type == RecipeIoType.ItemOutput;
                model.variables[captureVar][name] = isProduction ? -item.amount : item.amount;
            }
        } else if (child instanceof RecipeGroupModel) {
            CollectVariables(child, model, capture, null);
        }
    }
}

function ApplySolution(page:PageModel, solution:Solution):void
{
    for (const product of page.products) {
        
    }
}

export function SolvePage(page:PageModel):void
{
    let model:Model = {
        optimize: "obj",
        opType: "min",
        constraints: {},
        variables: {
            "obj": {},
        },
    }

    console.log("Solve model",model);
    CollectVariables(page.rootGroup, model, {}, page.products);

    let solution = Solve(model);
    console.log("Solve solution",solution);
    ApplySolution(page, solution);
}
