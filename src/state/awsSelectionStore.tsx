import { createStore } from "solid-js/store";
import { createComputed, createSignal, on } from "solid-js";

export interface ReplayStub {
    matchId: string;
    frameStart: number;
    frameEnd: number;
}

export interface SelectionState {
    stubs: ReplayStub[];
    selectedFileAndStub?: [File, ReplayStub];
}

export type SelectionStore = ReturnType<typeof createSelectionStore>;

function createSelectionStore() {
    const [selectionState, setSelectionState] = createStore<SelectionState>({
        stubs: [{
            matchId: "2025-06-02T03:30:29Z",
            frameStart: 8000,
            frameEnd: 8600
        }],
    });

    return { data: selectionState };
}

export const awsLibrary = createSelectionStore();

export const [currentSelectionStore, setCurrentSelectionStore] = createSignal<SelectionStore>(awsLibrary);
createComputed(
    on(
        () => awsLibrary.data.selectedFileAndStub,
        () => setCurrentSelectionStore(awsLibrary)
    )
);
