import {
  PlayerState,
  PlayerUpdate,
  PlayerUpdateWithNana,
  ReplayData,
} from "~/common/types";
import {replayStore} from "~/state/awsStore";

export function getStartOfAction(
  playerState: PlayerState,
  replayData: ReplayData
): number {

  let earliestStateOfAction = (
    getPlayerOnFrame(
      playerState.playerIndex,
      playerState.frameNumber,
      replayData,
      replayData.settings.frameCount,
    ) as PlayerUpdateWithNana
  )["state"];
  while (true) {
    const testEarlierState = getPlayerOnFrame(
      playerState.playerIndex,
      earliestStateOfAction.frameNumber - 1,
      replayData,
      replayData.settings.frameCount
    )?.["state"];
    if (
      testEarlierState === undefined ||
      testEarlierState.actionStateId !== earliestStateOfAction.actionStateId ||
      testEarlierState.actionStateFrameCounter >
        earliestStateOfAction.actionStateFrameCounter
    ) {
      return earliestStateOfAction.frameNumber;
    }
    earliestStateOfAction = testEarlierState;
  }
}

export function getPlayerOnFrame(
  playerIndex: number,
  frameNumber: number,
  replayData: ReplayData,
  offset?: number,
): PlayerUpdate {
  return replayData.frames[offset ? (offset - frameNumber) : frameNumber]?.players[playerIndex];
}
