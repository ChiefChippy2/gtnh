import { GetSingleRecipeDom } from "./nei.js";
import { Goods, Recipe, RecipeInOut } from "./repository.js";

export var currentTooltipElement:HTMLElement | undefined;
const tooltip = document.getElementById("tooltip")!;
const tooltipImage = tooltip.querySelector("#tooltip-icon") as HTMLElement;
const tooltipHeader = tooltip.querySelector("#tooltip-header") as HTMLElement;
const tooltipDebugInfo = tooltip.querySelector("#tooltip-debug") as HTMLElement;
const tooltipText = tooltip.querySelector("#tooltip-text") as HTMLElement;
const tooltipAction = tooltip.querySelector("#tooltip-action") as HTMLElement;
const tooltipMod = tooltip.querySelector("#tooltip-mod") as HTMLElement;
const tooltipRecipe = tooltip.querySelector("#tooltip-recipe") as HTMLElement;
let tooltipScrollTarget = 0;
let tooltipScrollCache = new Map<HTMLElement, number>();

interface TooltipData {
    header?: string;
    text?: string | null;
    action?: string | HTMLElement[] | null;
    goods?: Goods;
    recipe?: Recipe | null;
    overrideIo?: RecipeInOut[];
}

function OnGlobalScroll(ev: WheelEvent) : any {
  if (!tooltip || tooltip.style.display !== "block") return;
  
  // Scroll inside tooltip instead of page
  tooltipScrollTarget += ev.deltaY;
  tooltipScrollTarget = Math.max(0, Math.min(tooltipScrollTarget, tooltip.scrollHeight - tooltip.clientHeight));
  if (tooltip.scrollTop !== tooltipScrollTarget) {
    tooltip.scrollTop = tooltipScrollTarget;
    ev.preventDefault(); // block normal page scroll
  }
}

export function ShowTooltip(target: HTMLElement, data: TooltipData): void {
    if (data == null)
        return;

    const header = data.goods?.name ?? data.header ?? '';
    const debug = data.goods?.tooltipDebugInfo ?? null;
    const text = data.goods?.tooltip ?? data.text ?? null;
    const mod = data.goods?.mod ?? null;
    const iconId = data.goods?.iconId;
    const action = data.action ?? null;
    const recipe = data.recipe ?? null;
    const overrideIo = data.overrideIo;
    ShowTooltipRaw(target, header, window.accessibleMode, debug, text, mod, action, recipe, overrideIo, iconId);
    target.focus();
    if (!window.accessibleMode) target.addEventListener("mouseleave", () => HideTooltip(target), { once: true });
    if (tooltipScrollCache.has(target)) {
        tooltipScrollTarget = tooltipScrollCache.get(target)!;
    } else {
        tooltipScrollTarget = 0;
    }
 
    // Override smooth scroll for the initial scroll loaded from cache.
    // Otherwise it scrolls visibly every time.
    tooltip.style.scrollBehavior = 'auto';
    tooltipScrollTarget = Math.max(0, Math.min(tooltipScrollTarget, tooltip.scrollHeight - tooltip.clientHeight));
    tooltip.scrollTop = tooltipScrollTarget;
    tooltip.style.scrollBehavior = 'smooth';
    
    window.addEventListener("wheel", OnGlobalScroll, { passive: false });
}

function SetTextOptional(element:HTMLElement, data: string | HTMLElement[] | null, html: boolean)
{
    Array.from(element.childNodes).forEach(child => child.remove());
    if (data === undefined || data === null) element.style.display = "none";
    else {
        element.style.display = "block";
        if (html)
            {
               if (typeof data === 'string') element.innerHTML = data;
               else data.map(node => element.appendChild(node));
            }
        else
            if (typeof data === 'string') element.textContent = data;
    }
}

function SetIconOptional(element:HTMLElement, iconId?: number)
{
    if (iconId != null) {
        const ix = iconId % 256;
        const iy = Math.floor(iconId / 256);
        element.style.setProperty('--pos-x', `${ix * -32}px`);
        element.style.setProperty('--pos-y', `${iy * -32}px`);
        element.style.display = "block"
    }
    else element.style.display = "none";
}

function ShowTooltipRaw(target:HTMLElement, header:string, mobile: boolean, debug:string|null, description:string|null, mod:string|null, action:string|HTMLElement[]|null, recipe:Recipe|null, overrideIo?:RecipeInOut[], iconId?: number)
{
    tooltip.style.display = "block";
    currentTooltipElement = target;
    SetTextOptional(tooltipHeader, header, true);
    SetTextOptional(tooltipDebugInfo, debug, false);
    SetTextOptional(tooltipText, description, true);
    SetTextOptional(tooltipAction, action, true);
    SetIconOptional(tooltipImage, iconId);
    SetTextOptional(tooltipMod, mod, false);

    tooltipRecipe.style.display = "none";
    if (recipe) {
        tooltipRecipe.style.display = "block";
        tooltipRecipe.innerHTML = GetSingleRecipeDom(recipe, overrideIo);
    }
    if (mobile) {
        if (!tooltip.querySelector('#tooltip-close-btn')) {
            const closeBtn = document.createElement('button');
            closeBtn.style.right = '2%';
            closeBtn.style.bottom = '2%';
            closeBtn.id = 'tooltip-close-btn';
            closeBtn.textContent = '\u00D7'
            tooltip.appendChild(closeBtn);
        }
        const closeBtn = tooltip.querySelector('#tooltip-close-btn') as HTMLElement;
        if (!action)
        {
            closeBtn.addEventListener('click', HideTooltip.bind(null, target), {once: true})
            closeBtn.style.display = 'block';
        }
        else closeBtn.style.display = 'none';
        
        tooltip.classList.add('mobile-tooltip');
        tooltip.style.display = "flex";
        return;
    }
    else {
        tooltip.querySelector('#tooltip-close-btn')?.remove?.();
        tooltip.classList.remove('mobile-tooltip');
    }

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
    tooltipScrollCache.set(target, tooltipScrollTarget);
    const closeBtn = tooltip.querySelector('#tooltip-close-btn');
    if (closeBtn) closeBtn.remove();
    currentTooltipElement = undefined;
    tooltip.style.display = "none";
    window.removeEventListener("wheel", OnGlobalScroll);
}

export function IsHovered(obj:HTMLElement):boolean
{
    return currentTooltipElement === obj;
}