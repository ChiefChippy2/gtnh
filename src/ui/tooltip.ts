import { Goods } from "../data/repository.js";

const tooltip = document.getElementById("tooltip")!;
const tooltipHeader = tooltip.querySelector("[data-tooltip-header]") as HTMLElement;
const tooltipDebugInfo = tooltip.querySelector("[data-tooltip-debug]") as HTMLElement;
const tooltipText = tooltip.querySelector("[data-tooltip-text]") as HTMLElement;
const tooltipMod = tooltip.querySelector("[data-tooltip-mod]") as HTMLElement;

export function ShowTooltip(target:HTMLElement, data:Goods):void
{
    ShowTooltipRaw(target, data.name, data.tooltipDebugInfo, data.tooltip, data.mod);
}

function SetTextOptional(element:HTMLElement, data: string | null)
{
    if (data === undefined)
        element.style.display = "none";
    else {
        element.style.display = "block";
        element.textContent = data;
    }
}

function ShowTooltipRaw(target:HTMLElement, header:string, debug:string|null, description:string|null, mod:string|null)
{
    tooltipHeader.textContent = header;
    SetTextOptional(tooltipDebugInfo, debug);
    SetTextOptional(tooltipText, description);
    SetTextOptional(tooltipMod, mod);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const isRightHalf = targetRect.left > window.innerWidth / 2;

    tooltip.style.top = `${targetRect.top}px`;
    if (isRightHalf) {
        tooltip.style.right = `${targetRect.left}px`;
    } else {
        tooltip.style.left = `${targetRect.right}px`;
    }
}