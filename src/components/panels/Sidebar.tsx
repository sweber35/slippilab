import { Replays } from "~/components/panels/Replays";
import { Clips } from "~/components/panels/Clips";
import { currentSelectionStore } from "~/state/awsSelectionStore";

const store = currentSelectionStore();

export function Sidebar() {
    if (!store) {
        return <div>Loading store...</div>;
    }
    return (
        <>
          <div class="flex flex-col gap-8 px-4 sm:flex-row sm:gap-2 lg:hidden">
            <Replays selectionStore={store} />
            <Clips />
          </div>
        </>
    );
}
