import { createOptions, Select } from "@thisbeyond/solid-select";
import { createMemo, For, Show } from "solid-js";
import { Picker } from "~/components/common/Picker";
import { StageBadge } from "~/components/common/Badge";
import { ReplayStub, SelectionStore, currentCategory, setCurrentCategory } from "~/state/awsSelectionStore";

const categoryOptions = [
    { value: "Ledge Dashes", label: "Ledge Dashes" },
    { value: "Shine Grabs", label: "Shine Grabs" },
];

const stageOptions = [
    { type: "stage", label: "Battlefield" },
    { type: "stage", label: "Dream Land N64" },
    { type: "stage", label: "Final Destination" },
    { type: "stage", label: "Fountain of Dreams" },
    { type: "stage", label: "Pokémon Stadium" },
    { type: "stage", label: "Yoshi's Story" },
];

const categoryFilterProps = createOptions(categoryOptions, {
    key: "label",
});

const stageFilterProps = createOptions(
    [
        ...stageOptions,
    ],
    {
        key: "label",
        createable: (input: any) => ({
            type: "codeOrName", // or dynamically infer type from input
            label: input,
        }),
    }
);

export function Replays(props: { selectionStore: SelectionStore }) {
    console.log('Replays component render - selectionStore:', props.selectionStore);
    console.log('Current stubs count:', props.selectionStore?.data.stubs.length);
    console.log('Current filtered stubs count:', props.selectionStore?.data.filteredStubs.length);
    console.log('Current category signal value:', currentCategory());
    
    // Create a computed value for the current selected category option
    const currentCategoryOption = createMemo(() => {
        const current = currentCategory();
        return categoryOptions.find(opt => opt.value === current) || categoryOptions[0];
    });
    
    return (
        <>
          <div class="flex max-h-96 w-full flex-col items-center gap-2 overflow-y-auto sm:h-full md:max-h-screen">
            {/* Category Selection */}
            <div class="w-full">
              <label class="block text-sm font-medium text-gray-700 mb-1">Tech Skill Category</label>
              <Show when={currentCategory()} keyed>
                {(category) => {
                  const currentOption = categoryOptions.find(opt => opt.value === category) || categoryOptions[0];
                  return (
                    <Select
                      class="w-full rounded border border-slate-600 bg-white"
                      placeholder="Select tech skill category"
                      {...categoryFilterProps}
                      initialValue={currentOption}
                      onChange={(selected) => {
                        console.log('DEBUG 1', selected, selected?.length);
                        console.log('DEBUG selected type:', typeof selected);
                        console.log('DEBUG selected value:', selected);
                        
                        if (selected && typeof selected === 'object' && 'value' in selected) {
                          console.log('DEBUG 2', selected);
                          console.log('Changing category to:', selected.value);
                          setCurrentCategory(selected.value);
                        } else {
                          console.log('DEBUG: No valid selection');
                        }
                      }}
                    />
                  );
                }}
              </Show>
            </div>

            {/* Stage/Player Filtering */}
            <div
              class="w-full"
              // don't trigger global shortcuts when typing in the filter box
              onkeydown={(e: Event) => e.stopPropagation()}
              onkeyup={(e: Event) => e.stopPropagation()}
            >
              <label class="block text-sm font-medium text-gray-700 mb-1">Filter by Stage or Player</label>
              <Select
                class="w-full rounded border border-slate-600 bg-white"
                placeholder="Filter by stage or player name"
                multiple
                {...stageFilterProps}
                onChange={props.selectionStore.setFilters}
              />
            </div>

            <Show
              when={() => props.selectionStore?.data.filteredStubs.length > 0}
              fallback={<div>No matching results</div>}
            >
              <Picker
                items={props.selectionStore?.data.filteredStubs}
                render={(stub) => <GameInfo replayStub={stub} />}
                onClick={(fileAndSettings) =>
                  props.selectionStore.select(fileAndSettings)
                }
                selected={(stub) =>
                  props.selectionStore.data?.selectedFileAndStub?.[1] === stub
                }
                estimateSize={(stub) => 32
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
