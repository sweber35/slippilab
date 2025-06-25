import { Replays } from "~/components/panels/Replays";
import { Clips } from "~/components/panels/Clips";
import { awsLibrary } from "~/state/awsSelectionStore";

export function Sidebar() {
  return (
    <>
      <div class="flex flex-col gap-8 px-4 sm:flex-row sm:gap-2 lg:hidden">
        <Replays selectionStore={awsLibrary} />
        <Clips />
      </div>
    </>
  );
}
