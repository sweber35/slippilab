import { createOptions, Select } from "@thisbeyond/solid-select";
import { createMemo, For, Show } from "solid-js";
import { characterNameByExternalId, stageNameByExternalId } from "~/common/ids";
import { Picker } from "~/components/common/Picker";
import { StageBadge } from "~/components/common/Badge";
import { ReplayStub, SelectionStore } from "~/state/awsSelectionStore";

const filterProps = createOptions(
  [
    ...characterNameByExternalId.map((name) => ({
      type: "character",
      label: name,
    })),
    ...stageNameByExternalId.map((name) => ({ type: "stage", label: name })),
  ],
  {
    key: "label",
    createable: (code) => ({ type: "codeOrName", label: code }),
  }
);
export function Replays(props: { selectionStore: SelectionStore }) {
  return (
    <>
      <div class="flex max-h-96 w-full flex-col items-center gap-2 overflow-y-auto sm:h-full md:max-h-screen">
        <div
          class="w-full"
          // don't trigger global shortcuts when typing in the filter box
          onkeydown={(e: Event) => e.stopPropagation()}
          onkeyup={(e: Event) => e.stopPropagation()}
        >
          <Select
            class="w-full rounded border border-slate-600 bg-white"
            placeholder="Filter"
            multiple
            {...filterProps}
            initialValue={props.selectionStore?.data.filter}
            onChange={props.selectionStore.setFilter}
          />
        </div>
        <Show
          when={props.selectionStore?.data.stubs.length > 0}
          fallback={<div>No matching results</div>}
        >
          <Picker
            items={props.selectionStore?.data.stubs}
            render={(stub) => <GameInfo replayStub={stub} />}
            onClick={(fileAndSettings) =>
              props.selectionStore.select(fileAndSettings)
            }
            selected={(stub) =>
              props.selectionStore.data?.selectedFileAndStub?.[1] === stub
            }
            estimateSize={(stub) =>
              stub.playerSettings.filter(Boolean).length === 4 ? 56 : 32
            }
          />
        </Show>
      </div>
    </>
  );
}

function GameInfo(props: { replayStub: ReplayStub }) {
  return (
    <>
      <div class="flex w-full items-center">
        <StageBadge stageId={props.replayStub.stageId} />
      </div>
    </>
  );
}
