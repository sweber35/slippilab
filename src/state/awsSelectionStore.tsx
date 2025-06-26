import { createStore } from "solid-js/store";
import { createEffect, createSignal, on } from "solid-js";
import { ReplayData, Frame } from "~/common/types";
import { stageNameByExternalId, ExternalStageName } from "~/common/ids";

export type Category = 'Ledge Dashes' | 'Shine Grabs';

export type Filter = 
  | { type: "stage"; label: ExternalStageName }
  | { type: "codeOrName"; label: string };

async function loadStubsForCategory(category: Category): Promise<ReplayStub[]> {
    const res = await fetch("https://xpzvwi2rsi.execute-api.us-east-2.amazonaws.com/dev/replay-stub-lambda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
    });

    const payload = await res.json();

    return payload;
}

export interface SelectionState {
    filter?: Category;
    filters: Filter[];
    stubs: ReplayStub[];
    filteredStubs: ReplayStub[];
    selectedFileAndStub?: [ReplayData, ReplayStub];
}

export interface ReplayStub {
    category?: Category;
    matchId: string;
    frameStart: number;
    frameEnd: number;
    stageId: number;
    playerSettings?: {
        playerIndex: number;
        connectCode: string;
        displayName: string;
        nametag: string;
        externalCharacterId: number;
        teamId: number;
    }[];
}

interface StubStore {
    stubs: () => ReplayStub[];
    getReplayData: (stub: ReplayStub) => Promise<ReplayData>;
}

export type SelectionStore = ReturnType<typeof createSelectionStore>;

function createSelectionStore(stubStore: StubStore) {

    const [selectionState, setSelectionState] = createStore<SelectionState>({
        stubs: [],
        filters: [],
        filteredStubs: [],
    });

    function setFilter(filter: Category) {
        setSelectionState("filter", filter);
    }

    function setFilters(filters: Filter[]) {
        setSelectionState("filters", filters);
    }

    async function select(stub: ReplayStub) {
        const data = await stubStore.getReplayData(stub);
        setSelectionState("selectedFileAndStub", [data, stub]);
    }

    createEffect(() => {
        setSelectionState("stubs", stubStore.stubs());
        console.log("Updated selectionState.stubs:", stubStore.stubs());
    });

    createEffect(() => {
        // Apply filters to stubs
        const filtered = selectionState.stubs.filter((stub) => {
            const stagesAllowed = selectionState.filters
                .filter((filter) => filter.type === "stage")
                .map((filter) => filter.label);
            
            const namesNeeded = selectionState.filters
                .filter((filter) => filter.type === "codeOrName")
                .map((filter) => filter.label);

            // Check stage filter
            const stagePass = stagesAllowed.length === 0 || 
                stagesAllowed.includes(stageNameByExternalId[stub.stageId]);

            // Check name filter
            const areNamesSatisfied = namesNeeded.length === 0 || namesNeeded.every((name) =>
                stub.playerSettings?.some((p) =>
                    [
                        p.connectCode?.toLowerCase(),
                        p.displayName?.toLowerCase(),
                        p.nametag?.toLowerCase(),
                    ].includes(name.toLowerCase())
                )
            );

            return stagePass && areNamesSatisfied;
        });

        setSelectionState("filteredStubs", filtered);
    });

    createEffect(
        on(
            () => stubStore.stubs(),
            () => {
                setSelectionState("selectedFileAndStub", undefined);
            }
        )
    );

    return { data: selectionState, setFilter, setFilters, select };
}

const categoryStores: Record<string, SelectionStore> = {};

async function initCategoryStore(category: Category) {
    console.log('Loading stubs for category:', category);
    const stubs = await loadStubsForCategory(category);
    console.log('Loaded stubs:', stubs.length, 'for category:', category);

    const [stubSignal, setStubSignal] = createSignal<ReplayStub[]>(stubs);
    console.log("Loaded stubs:", stubs);

    categoryStores[category] = createSelectionStore({
        stubs: stubSignal,
        async getReplayData(stub): Promise<ReplayData> {
            const result = await fetch('https://48il4rqxli.execute-api.us-east-2.amazonaws.com/dev/replay-data-lambda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stub),
            });

            if (!result.ok) {
                throw new Error(`Lambda fetch failed: ${result.statusText}`);
            }

            const data = await result.json();

            const replayData: ReplayData = {
                ...data,
                frameIndexByNumber: Object.fromEntries(
                    data.frames.map((frame: Frame, index: number) => [frame.frameNumber, index])
                )
            };

            for (let i = 1; i < replayData.frames.length; i++) {
                const prev = replayData.frames[i - 1].frameNumber;
                const curr = replayData.frames[i].frameNumber;
                if (curr !== prev + 1) {
                    console.warn(`Frame gap between ${prev} and ${curr}`);
                }
            }
            console.log('Loaded replay data:', replayData);

            return replayData;
        },
    });
    console.log('Category store created for:', category);
}

export const [currentCategory, setCurrentCategory] = createSignal<Category>("Ledge Dashes");
export const [currentSelectionStore, setCurrentSelectionStore] = createSignal<SelectionStore | undefined>(undefined);

// Initialize the first category store immediately
(async () => {
    console.log('Initializing first category store');
    await initCategoryStore("Ledge Dashes");
    setCurrentSelectionStore(categoryStores["Ledge Dashes"]);
})();

createEffect(async () => {
    const category = currentCategory();
    console.log('Category changed to:', category);

    if (!categoryStores[category]) {
        console.log('Initializing category store for:', category);
        await initCategoryStore(category);
    }
    console.log('setCurrentSelectionStore():', category, categoryStores[category]);
    setCurrentSelectionStore(categoryStores[category]);
    
    // Clear filters when changing categories
    if (categoryStores[category]) {
        console.log('Clearing filters for category:', category);
        categoryStores[category].setFilters([]);
    }
});
