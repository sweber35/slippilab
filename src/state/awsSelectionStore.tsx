import { createStore } from "solid-js/store";
import {createComputed, createEffect, createSignal, on} from "solid-js";
import { ReplayData } from "~/common/types";

export type Filter = 'Ledge Dashes' | 'Shine Grabs';

export interface SelectionState {
    filter?: Filter;
    stubs: ReplayStub[];
    selectedFileAndStub?: [string, ReplayStub];
}

export interface ReplayStub {
    category?: Filter;
    matchId: string;
    frameStart: number;
    frameEnd: number;
    stageId: number;
    playerSettings: {
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
    getReplayData: (stub: ReplayStub) => Promise<string>;
}

export type SelectionStore = ReturnType<typeof createSelectionStore>;

function createSelectionStore(stubStore: StubStore) {

    const [selectionState, setSelectionState] = createStore<SelectionState>({
        stubs: [{
            matchId: "2025-06-02T03:30:29Z",
            frameStart: 8000,
            frameEnd: 8600,
            stageId: 2,
            playerSettings: [
                {
                    playerIndex: 0,
                    connectCode: "SHAG#127",
                    displayName: "Shagnarok",
                    nametag: "Shagnarok",
                    externalCharacterId: 22,
                    teamId: 1
                },
                {
                    playerIndex: 1,
                    connectCode: "SMBL#8",
                    displayName: "Blood Raven",
                    nametag: "Blood Raven",
                    externalCharacterId: 17,
                    teamId: 2
                }
            ]
        }],
    });

    function setFilter(filter: Filter) {
        setSelectionState("filter", filter);
    }

    async function select(stub: ReplayStub) {
        const data = await stubStore.getReplayData(stub);
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
    createEffect(() => {
        setSelectionState(
            "stubs",
            stubStore.stubs().filter( stub => stub.category === selectionState.filter)
        );
    });

    return { data: selectionState, setFilter, select };
}

const [awsStubs, setAwsStubs] = createSignal<ReplayStub[]>([]);
export const awsLibrary = createSelectionStore({
    stubs: awsStubs,

    getReplayData: async ({
        matchId,
        frameStart,
        frameEnd
    }: {
        matchId: string,
        frameStart: number,
        frameEnd: number
    }) => {
        const result = await fetch('https://48il4rqxli.execute-api.us-east-2.amazonaws.com/dev/replay-data-lambda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matchId,
                frameStart,
                frameEnd
            }),
        });

        if (!result.ok) {
            throw new Error(`Lambda fetch failed: ${result.statusText}`);
        }

        return await result.json();
    }
});

export const [currentSelectionStore, setCurrentSelectionStore] = createSignal<SelectionStore>(awsLibrary);
createComputed(
    on(
        () => awsLibrary.data.selectedFileAndStub,
        () => setCurrentSelectionStore(awsLibrary)
    )
);
