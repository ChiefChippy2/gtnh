import { Goods } from "../data/repository.js";

var currentTooltipElement:HTMLElement | undefined;
const tooltip = document.getElementById("tooltip")!;
const tooltipHeader = tooltip.querySelector("#tooltip-header") as HTMLElement;
const tooltipDebugInfo = tooltip.querySelector("#tooltip-debug") as HTMLElement;
const tooltipText = tooltip.querySelector("#tooltip-text") as HTMLElement;
const tooltipMod = tooltip.querySelector("#tooltip-mod") as HTMLElement;

export function ShowTooltip(target:HTMLElement, data:Goods | null):void
{
    if (data == null)
        return;
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
    tooltip.style.display = "block";
    currentTooltipElement = target;
    tooltipHeader.textContent = header;
    SetTextOptional(tooltipDebugInfo, debug);
    SetTextOptional(tooltipText, description);
    SetTextOptional(tooltipMod, mod);

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const isRightHalf = targetRect.left > window.innerWidth / 2;

    if (isRightHalf) {
        tooltip.style.left = `${targetRect.left - tooltipRect.width}px`;
    } else {
        tooltip.style.left = `${targetRect.right}px`;
    }

    if (targetRect.top + tooltipRect.height > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - tooltipRect.height}px`;
    } else {
        tooltip.style.top = `${Math.max(targetRect.top, 0)}px`;
    }
}

export function HideTooltip(target:HTMLElement)
{
    if (currentTooltipElement !== target)
        return;
    currentTooltipElement = undefined;
    tooltip.style.display = "none";
}