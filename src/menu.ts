import { PageModel, serializer, SetCurrentPage, addProjectChangeListener, page } from './page.js';
import { showConfirmDialog } from './dialogues.js';

export class PageManager {
    private pages: string[] = [];
    private currentPage: string | null = null;
    private pageListContainer: HTMLElement;
    private pageCache: Map<string, PageModel> = new Map();

    constructor() {
        this.pageListContainer = document.querySelector('.page-list')!;
        this.loadPagesFromStorage();
        this.render();
        this.loadFirstPage();
        this.setupEventListeners();
        this.setupPageChangeListener();
        this.setupUndoHandler();
        this.setupUrlHashHandler();
    }

    private setupUndoHandler() {
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }
        });
    }

    private setupPageChangeListener() {
        addProjectChangeListener(() => {
            if (this.currentPage && page) {
                // Serialize and save the current page when it changes
                const serialized = JSON.stringify(serializer.Serialize(page));
                localStorage.setItem(`p:${this.currentPage}`, serialized);
                // Update cache
                this.pageCache.set(this.currentPage, page);
                // Add to history
                page.addToHistory(serialized);
            }
        });
    }

    private setupEventListeners() {
        this.pageListContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.matches('[data-action="switch-page"]')) {
                const pageName = target.dataset.pageName;
                if (pageName) this.switchPage(pageName);
            }
        });

        this.pageListContainer.addEventListener('blur', (e) => {
            const target = e.target as HTMLElement;
            if (target.matches('[data-action="rename-page"]')) {
                const input = target as HTMLInputElement;
                const oldName = input.dataset.pageName;
                const newName = input.value.trim();
                
                if (oldName && newName && oldName !== newName) {
                    this.renamePage(oldName, newName);
                }
            }
        }, true);

        this.pageListContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const target = e.target as HTMLElement;
                if (target.matches('[data-action="rename-page"]')) {
                    target.blur();
                }
            }
        }, true);

        document.querySelector('[data-action="create-page"]')?.addEventListener('click', () => {
            const input = document.querySelector('[data-action="page-name-input"]') as HTMLInputElement;
            if (input && input.value.trim()) {
                this.createNewPage(input.value.trim());
                input.value = '';
            }
        });
    }

    private loadPagesFromStorage() {
        this.pages = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)!;
            if (key.startsWith('p:')) {
                console.log("Found page", key);
                this.pages.push(key.substring(2));
            }
        }
        this.pages.sort();
    }

    private render() {
        this.pageListContainer.innerHTML = this.pages.map(pageName => {
            if (pageName === this.currentPage) {
                return `
                    <div class="page-rename">
                        <input type="text" 
                               value="${pageName}"
                               data-action="rename-page"
                               data-page-name="${pageName}">
                    </div>
                `;
            } else {
                return `
                    <button class="page-button"
                            data-action="switch-page"
                            data-page-name="${pageName}">
                        ${pageName}
                    </button>
                `;
            }
        }).join('');
    }

    private loadFirstPage() {
        if (this.pages.length > 0) {
            this.switchPage(this.pages[0]);
        } else {
            this.createNewPage('New');
        }
    }

    private switchPage(pageName: string) {
        if (this.currentPage === pageName) return;
        
        this.currentPage = pageName;
        
        // Try to get page from cache first
        let page = this.pageCache.get(pageName);
        
        if (!page) {
            // If not in cache, load from localStorage
            const stored = localStorage.getItem(`p:${pageName}`);
            if (stored) {
                page = new PageModel(JSON.parse(stored));
                this.pageCache.set(pageName, page);
                // Initialize history with the loaded state
                page.addToHistory(stored);
            }
        }
        
        if (page) {
            SetCurrentPage(page);
        }
        
        this.render();
    }

    private createNewPage(pageName: string) {
        let finalName = pageName;
        let counter = 1;
        while (this.pages.includes(finalName)) {
            finalName = `${pageName} ${counter}`;
            counter++;
        }
        
        const page = new PageModel();
        page.name = finalName;
        const serialized = JSON.stringify(serializer.Serialize(page));
        localStorage.setItem(`p:${finalName}`, serialized);
        
        this.pages.push(finalName);
        this.pages.sort();
        this.pageCache.set(finalName, page);
        // Initialize history with the initial state
        page.addToHistory(serialized);
        this.switchPage(finalName);
        this.render();
    }

    private undo() {
        if (page && page.undo()) {
            // After undo, update the cache and localStorage
            const serialized = JSON.stringify(serializer.Serialize(page));
            if (this.currentPage) {
                localStorage.setItem(`p:${this.currentPage}`, serialized);
                this.pageCache.set(this.currentPage, page);
            }
            // Notify listeners about the change
            SetCurrentPage(page);
        }
    }

    private setupUrlHashHandler() {
        window.addEventListener('hashchange', () => this.handleUrlHashChange());
        this.handleUrlHashChange();
    }

    private async handleUrlHashChange() {
        const hash = window.location.hash.slice(1); // Remove the # symbol
        if (!hash) return;

        try {
            // Convert from URL-safe base64 back to normal base64
            const base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
            // Decode base64
            const compressed = atob(base64);
            // Decompress
            const data = new Uint8Array(compressed.split('').map(c => c.charCodeAt(0)));
            const decompressedStream = new DecompressionStream('deflate');
            const writer = decompressedStream.writable.getWriter();
            writer.write(data);
            writer.close();
            const decompressed = await new Response(decompressedStream.readable).arrayBuffer();
            const json = new TextDecoder().decode(decompressed);
            console.log("Loaded page", json);
            const importedPage = new PageModel(JSON.parse(json));
            this.importPage(importedPage);
        } catch (e) {
            console.error("Failed to load from URL fragment:", e);
        }
    }

    private generateUniquePageName(baseName: string): string {
        let finalName = baseName;
        let counter = 1;
        while (this.pages.includes(finalName)) {
            finalName = `${baseName} ${counter}`;
            counter++;
        }
        return finalName;
    }

    public importPage(model: PageModel) {
        if (!model.name) return;

        const existingIndex = this.pages.indexOf(model.name);
        if (existingIndex !== -1) {
            // Page with this name exists
            showConfirmDialog(
                `A page named "${model.name}" already exists. What would you like to do?`,
                "Create New",
                "Replace Existing",
                "Cancel"
            ).then(action => {
                if (action === "yes") {
                    const newName = this.generateUniquePageName(model.name);
                    this.saveAndSwitchToPage(newName, model);
                } else if (action === "no") {
                    // Replace existing page
                    this.saveAndSwitchToPage(model.name, model);
                }
                // If cancel, do nothing
            });
        } else {
            // New page name
            this.saveAndSwitchToPage(model.name, model);
        }
    }

    private saveAndSwitchToPage(pageName: string, model: PageModel) {
        const serialized = JSON.stringify(serializer.Serialize(model));
        localStorage.setItem(`p:${pageName}`, serialized);
        
        if (!this.pages.includes(pageName)) {
            this.pages.push(pageName);
            this.pages.sort();
        }
        
        this.pageCache.set(pageName, model);
        model.addToHistory(serialized);
        this.switchPage(pageName);
        this.render();
    }

    private renamePage(oldName: string, newName: string) {
        const page = this.pageCache.get(oldName);
        if (!page) return;

        let finalName = newName;
        if (this.pages.includes(newName)) {
            finalName = this.generateUniquePageName(newName);
        }

        // Remove from old name
        localStorage.removeItem(`p:${oldName}`);
        this.pageCache.delete(oldName);
        const oldIndex = this.pages.indexOf(oldName);
        if (oldIndex !== -1) {
            this.pages.splice(oldIndex, 1);
        }

        // Add to new name
        page.name = finalName;
        const serialized = JSON.stringify(serializer.Serialize(page));
        localStorage.setItem(`p:${finalName}`, serialized);
        this.pageCache.set(finalName, page);
        this.pages.push(finalName);
        this.pages.sort();

        // Update current page if needed
        if (this.currentPage === oldName) {
            this.currentPage = finalName;
        }

        this.render();
    }
}

new PageManager();
