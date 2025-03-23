var scrollbarWidth:number | undefined;

export function GetScrollbarWidth()
{
    if (scrollbarWidth === undefined) {
        // Create the measurement node
        var scrollDiv = document.createElement("div");
        scrollDiv.className = "scrollbar-measure";
        document.body.appendChild(scrollDiv);

        // Get the scrollbar width
        scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

        // Delete the DIV 
        document.body.removeChild(scrollDiv);
        console.log("Scrollbar width: "+scrollbarWidth);
    }
    return scrollbarWidth;
}