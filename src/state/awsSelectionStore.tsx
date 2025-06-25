import { createStore } from "solid-js/store";
import { createEffect, createSignal, on } from "solid-js";
import { ReplayData } from "~/common/types";

export type Category = 'Ledge Dashes' | 'Shine Grabs';

async function loadStubsForCategory(category: Category): Promise<ReplayStub[]> {
    const res = await fetch("https://xpzvwi2rsi.execute-api.us-east-2.amazonaws.com/dev/replay-stub-lambda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
    });

    const payload = await res.json();

    console.log('loadStubsForCategory():', payload);
    return payload;
}

export interface SelectionState {
    filter?: Category;
    stubs: ReplayStub[];
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
    });

    function setFilter(filter: Category) {
        setSelectionState("filter", filter);
    }

    async function select(stub: ReplayStub) {
        const data = await stubStore.getReplayData(stub);
        console.log('select:', data);
        setSelectionState("selectedFileAndStub", [data, stub]);
    }

    createEffect(
        on(
            () => stubStore.stubs(),
            () => {
                setSelectionState({ selectedFileAndStub: undefined });
            }
        )
    );

    // Update filter results if stubs or filters change
    // createEffect(() => {
    //     setSelectionState(
    //         "stubs",
    //         stubStore.stubs().filter( stub => stub.category === selectionState.filter)
    //     );
    // });

    return { data: selectionState, setFilter, select };
}

const categoryStores: Record<string, SelectionStore> = {};

async function initCategoryStore(category: Category) {
    const stubs = await loadStubsForCategory(category);

    const [stubSignal, setStubSignal] = createSignal<ReplayStub[]>(stubs);

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

            const replayData = await result.json();
            console.log('getReplayData():', replayData);

            return await replayData as ReplayData;
        },
    });
}

export const [currentCategory, setCurrentCategory] = createSignal<Category>("Ledge Dashes");
export const [currentSelectionStore, setCurrentSelectionStore] = createSignal<SelectionStore>();

createEffect(async () => {
    const category = currentCategory();

    if (!categoryStores[category]) {
        await initCategoryStore(category);
    }
    console.log('setCurrentSelectionStore():', category, categoryStores[category]);
    setCurrentSelectionStore(categoryStores[category]);
});
