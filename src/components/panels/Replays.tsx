import { createOptions, Select } from "@thisbeyond/solid-select";
import { createMemo, For, Show } from "solid-js";
import { Picker } from "~/components/common/Picker";
import { StageBadge } from "~/components/common/Badge";
import { ReplayStub, SelectionStore, currentCategory, setCurrentCategory } from "~/state/awsSelectionStore";
import { characterNameByExternalId } from "~/common/ids";

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
                        if (selected && typeof selected === 'object' && 'value' in selected) {
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
                estimateSize={(stub) => 120}
              />
            </Show>
          </div>
        </>
    );
}

function GameInfo(props: { replayStub: ReplayStub }) {
  // Parse the players string to extract player tags and character IDs
  const parsePlayers = () => {
    try {
      // Remove the outer brackets and split by player entries
      const playersStr = props.replayStub.players.slice(1, -1); // Remove [ and ]
      const playerEntries = playersStr.split('}, {');
      
      return playerEntries.map(entry => {
        // Clean up the entry and extract tag and character ID
        const cleanEntry = entry.replace('{', '').replace('}', '');
        const [tag, characterId] = cleanEntry.split(', ').map(s => s.trim());
        return { tag, characterId: parseInt(characterId) };
      });
    } catch (error) {
      console.error('Error parsing players:', error);
      return [];
    }
  };

  const players = parsePlayers();

  return (
    <div class="h-24 p-3 border-b border-gray-200 hover:bg-gray-50 mb-1">
      {/* Header with stage and date */}
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <StageBadge stageId={props.replayStub.stageId} />
          <div class="text-sm text-gray-600">
            {new Date(props.replayStub.matchId).toLocaleDateString()}
          </div>
        </div>
        <div class="text-xs text-gray-500">
          Frames {props.replayStub.frameStart}-{props.replayStub.frameEnd}
        </div>
      </div>
      
      {/* Player information */}
      <div class="space-y-1">
        <div class="text-xs font-medium text-gray-700">Players:</div>
        {players.map((player, index) => (
          <div class="text-xs text-gray-600 pl-2">
            <span class="font-medium">{player.tag}</span>
            <span class="text-gray-500 ml-2">
              ({characterNameByExternalId[player.characterId] || `Character ${player.characterId}`})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
