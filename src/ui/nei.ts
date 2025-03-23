import { GetScrollbarWidth } from "../utils.js";
import { Goods, Fluid, Item, Repository, IMemMappedObjectPrototype } from "../data/repository.js";
import { IconBox } from "./iconBox.js";

const nei = document.getElementById("nei")!;
const neiContent = nei.querySelector("#nei-content")!;
const elementSize = 36;

var unitWidth = 0, unitHeight = 0;
var scrollWidth = GetScrollbarWidth();
window.addEventListener("resize", resize);
resize();
fillWithItems();

function resize()
{
    var newUnitWidth = Math.round((window.innerWidth - 120 - scrollWidth) / elementSize);
    var newUnitHeight = Math.round((window.innerHeight - 160) / elementSize);
    if (newUnitWidth !== unitWidth || newUnitHeight !== unitHeight)
    {
        unitWidth = newUnitWidth;
        unitHeight = newUnitHeight;
        nei.style.width = `${unitWidth * elementSize + scrollWidth}px`;
        nei.style.height = `${unitHeight * elementSize}px`;
    }
}

function FillWith<T extends Goods>(arr:Int32Array, proto:IMemMappedObjectPrototype<T>)
{
    arr.forEach(element => {
        var box = document.createElement("icon-box") as IconBox;
        var goods = Repository.current.GetObject(element, proto);
        neiContent.appendChild(box);
        box.SetGoods(goods);
    });
}


function fillWithItems()
{
    FillWith(Repository.current.fluids, Fluid);
    //FillWith(Repository.current.items, Item);
    nei.style.display = "block";
}