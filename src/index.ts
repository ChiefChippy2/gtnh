const loading = document.getElementById("loading")!;
try {
    // Load the atlas image
    const atlas = new Image();
    atlas.src = "./data/atlas.webp";

    await Promise.all([
        import("./repository.js"),
        import("./itemIcon.js"),
        import("./tooltip.js"),
        import("./nei.js"),
        import("./menu.js"),
        import("./recipeList.js")
    ]);
    let page = await import("./page.js");
    page.UpdateProject();
    loading.remove();
} catch (error:any) {
    loading.innerHTML = "An error occurred on loading:<br>" + error.message;
    console.error(error);
}

export {};