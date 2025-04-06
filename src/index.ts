const loading = document.getElementById("loading")!;
try {
    await Promise.all([
        import("./repository.js"),
        import("./page.js"),
        import("./itemIcon.js"),
        import("./tooltip.js"),
        import("./nei.js"),
        import("./menu.js"),
        import("./recipeList.js")
    ]);

    // Load the atlas image
    const atlas = new Image();
    atlas.src = "./data/atlas.webp";
    await new Promise((resolve) => {
        atlas.onload = resolve;
    });
    loading.remove();
} catch (error:any) {
    loading.innerHTML = "An error occurred on loading:<br>" + error.message;
    console.error(error);
}

export {};