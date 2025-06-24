import createRAF, { targetFPS } from "@solid-primitives/raf";
import { createEffect, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import {
    characterNameByExternalId,
    characterNameByInternalId,
} from "~/common/ids";
import { queries } from "~/search/queries";
import { currentSelectionStore } from "~/state/awsSelectionStore";
import { fetchAnimations } from "~/viewer/animationCache";
import { computeRenderData, ReplayStore, wrapFrame } from "~/state/replayStore";

export const defaultReplayStoreState: ReplayStore = {
    highlights: Object.fromEntries(
        Object.entries(queries).map(([name]) => [name, []])
    ),
    frame: 0,
    renderDatas: [],
    animations: Array(4).fill(undefined),
    fps: 60,
    framesPerTick: 1,
    running: false,
    zoom: 1,
    isDebug: false,
    isFullscreen: false,
    customAction: "Wait",
    customAttack: "None",
};

const [replayState, setReplayState] = createStore<ReplayStore>(
    defaultReplayStoreState
);

export const replayStore = replayState;

const [running, start, stop] = createRAF(
    targetFPS(
        () =>
            setReplayState("frame", (f) =>
                wrapFrame(replayState, f + replayState.framesPerTick)
            ),
        () => replayState.fps
    )
);
createEffect(() => setReplayState("running", running()));

createEffect(async () => {
    const selected = currentSelectionStore().data.stubs[0];
    if (selected === undefined) {
        setReplayState(defaultReplayStoreState);
        return;
    }

    const result = await fetch('https://48il4rqxli.execute-api.us-east-2.amazonaws.com/dev/replay-data-lambda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
    })

    const replayData = await result.json();

    setReplayState({
        replayData,
        frame: 0,
        renderDatas: [],
    });

    start();
});

const animationResources = [];
for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    animationResources.push(
        createResource(
            () => {
                const replay = replayState.replayData;
                if (replay === undefined) {
                    return undefined;
                }
                const playerSettings = replay.settings.playerSettings[playerIndex];
                if (playerSettings === undefined) {
                    return undefined;
                }
                const playerUpdate =
                    replay.frames[replayState.frame].players[playerIndex];
                if (playerUpdate === undefined) {
                    return playerSettings.externalCharacterId;
                }
                if (
                    playerUpdate.state.internalCharacterId ===
                    characterNameByInternalId.indexOf("Zelda")
                ) {
                    return characterNameByExternalId.indexOf("Zelda");
                }
                if (
                    playerUpdate.state.internalCharacterId ===
                    characterNameByInternalId.indexOf("Sheik")
                ) {
                    return characterNameByExternalId.indexOf("Sheik");
                }
                return playerSettings.externalCharacterId;
            },
            (id) => (id === undefined ? undefined : fetchAnimations(id))
        )
    );
}
animationResources.forEach(([dataSignal], playerIndex) =>
    createEffect(() =>
        // I can't use the obvious setReplayState("animations", playerIndex,
        // dataSignal()) because it will merge into the previous animations data
        // object, essentially overwriting the previous characters animation data
        // forever
        setReplayState("animations", (animations) => {
            const newAnimations = [...animations];
            newAnimations[playerIndex] = dataSignal();
            return newAnimations;
        })
    )
);

createEffect(() => {
    if (replayState.replayData === undefined) {
        return;
    }
    setReplayState(
        "renderDatas",
        replayState.replayData.frames[replayState.frame].players
            .filter((playerUpdate) => playerUpdate)
            .flatMap((playerUpdate) => {
                const animations = replayState.animations[playerUpdate.playerIndex];
                if (animations === undefined) return [];
                const renderDatas = [];
                renderDatas.push(
                    computeRenderData(replayState, playerUpdate, animations, false)
                );
                if (playerUpdate.nanaState != null) {
                    renderDatas.push(
                        computeRenderData(replayState, playerUpdate, animations, true)
                    );
                }
                return renderDatas;
            })
    );
});
