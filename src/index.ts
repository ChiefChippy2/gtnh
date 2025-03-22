import { getGuiScale } from "./dpi.js";
import { Repository } from "./data/repository.js";

async function loadData()
{
    var response = (await fetch("/data/data.bin"));
    const buffer = await response.arrayBuffer();
    var repository = new Repository(buffer);
    console.log("Repository loaded", repository);
}

//loadData();

document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root") as HTMLElement;
    const scale = getGuiScale();
    
    //root.style.transform = `scale(${scale})`;

    console.log(`GUI Scale set to ${scale}x`);
});