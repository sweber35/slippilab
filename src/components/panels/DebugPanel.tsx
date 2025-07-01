import { createMemo, For, Show, createSignal, onMount } from "solid-js";
import { replayStore } from "~/state/awsStore";
import { characterNameByExternalId } from "~/common/ids";
import { getPlayerOnFrame, getStartOfAction } from "~/viewer/viewerUtil";

// Toggle this to enable/disable the debug panel
const DEBUG_PANEL_ENABLED = true;

export function DebugPanel() {
  if (!DEBUG_PANEL_ENABLED) return null;

  const renderDatas = createMemo(() => replayStore.renderDatas);
  const currentFrame = createMemo(() => replayStore.frame);
  const replayData = createMemo(() => replayStore.replayData);

  // Track player order changes
  const [playerOrderHistory, setPlayerOrderHistory] = createSignal<Array<{
    frame: number;
    players: Array<{
      index: number;
      port: number;
      character: string;
      facingDirection: number;
    }>;
  }>>([]);

  // Update history when frame changes
  createMemo(() => {
    const frame = currentFrame();
    const datas = renderDatas();
    
    if (datas.length > 0) {
      const currentOrder = datas.map(rd => ({
        index: rd.playerInputs.playerIndex,
        port: rd.playerSettings.port,
        character: characterNameByExternalId[rd.playerSettings.externalCharacterId],
        facingDirection: rd.playerState.facingDirection
      }));

      setPlayerOrderHistory(prev => {
        const newHistory = [...prev];
        // Only add if order changed or it's a new frame
        const lastEntry = newHistory[newHistory.length - 1];
        if (!lastEntry || 
            lastEntry.frame !== frame ||
            JSON.stringify(lastEntry.players) !== JSON.stringify(currentOrder)) {
          newHistory.push({
            frame,
            players: currentOrder
          });
          // Keep only last 10 entries
          if (newHistory.length > 10) {
            newHistory.shift();
          }
        }
        return newHistory;
      });
    }
  });

  const [showPlayerOrderHistory, setShowPlayerOrderHistory] = createSignal(false);

  return (
    <Show when={replayData()}>
      <div class="fixed top-4 right-4 w-96 max-h-96 overflow-y-auto bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50">
        <div class="text-sm font-bold mb-2 text-yellow-400">Debug Panel</div>
        <div class="mb-2 text-gray-300">Frame: {currentFrame()}</div>
        
        <Show when={showPlayerOrderHistory()}>
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold">Player Order History</h4>
              <button
                onClick={() => setShowPlayerOrderHistory(!showPlayerOrderHistory())}
                class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >
                {showPlayerOrderHistory() ? "Hide" : "Show"}
              </button>
            </div>
            <div class="text-xs text-gray-300 max-h-32 overflow-y-auto">
              <For each={playerOrderHistory()}>
                {(entry) => (
                  <div class="mb-1">
                    Frame {entry.frame}: {entry.players.map(p => p.character).join(", ")}
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
        
        <div class="mb-2">
          <button
            onClick={() => setShowPlayerOrderHistory(!showPlayerOrderHistory())}
            class="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
          >
            {showPlayerOrderHistory() ? "Hide" : "Show"} Player Order History
          </button>
        </div>

        {/* Current Player Data */}
        <For each={renderDatas()}>
          {(renderData) => {
            // Always use absolute frame numbers for lookups
            const relativeFrame = replayStore.frame;
            if (!replayStore.replayData) return null;
            const absoluteFrame = replayStore.replayData.frames[relativeFrame]?.frameNumber;
            const playerIndex = renderData.playerSettings.playerIndex;
            // Defensive fallback for missing absolute frame
            if (absoluteFrame === undefined) {
              return (
                <div class="mb-4 p-2 border border-gray-600 rounded">
                  <div class="font-bold text-blue-400 mb-1">
                    Player {renderData.playerInputs.playerIndex + 1} (Port {renderData.playerSettings.port})
                  </div>
                  <div class="text-red-400">No absolute frame for relative frame {relativeFrame}</div>
                </div>
              );
            }
            // Use absolute frame for all getPlayerOnFrame calls
            const currentFramePlayerUpdate = getPlayerOnFrame(
              playerIndex,
              absoluteFrame,
              replayStore.replayData!
            );
            const playerState = renderData.playerState;
            // Defensive fallback for missing player data
            if (!currentFramePlayerUpdate || !currentFramePlayerUpdate.state) {
              return (
                <div class="mb-4 p-2 border border-gray-600 rounded">
                  <div class="font-bold text-blue-400 mb-1">
                    Player {renderData.playerInputs.playerIndex + 1} (Port {renderData.playerSettings.port})
                  </div>
                  <div class="text-red-400">No player {playerIndex} data at absolute frame {absoluteFrame}</div>
                </div>
              );
            }
            // Use absolute frame for getStartOfAction
            const startOfActionFrame = getStartOfAction(playerState, replayStore.replayData!);
            const startOfActionPlayerUpdate = getPlayerOnFrame(
              playerIndex,
              startOfActionFrame,
              replayStore.replayData!
            );
            const startState = startOfActionPlayerUpdate?.state;
            const returnedPlayerIndex = startOfActionPlayerUpdate?.playerIndex;
            const stubStartFrame = replayStore.replayData.frames[0]?.frameNumber;
            const stubEndFrame = replayStore.replayData.frames[replayStore.replayData.frames.length - 1]?.frameNumber;

            // --- Debug Panel UI ---
            return (
              <div class="mb-4 p-2 border border-gray-600 rounded">
                <div class="font-bold text-blue-400 mb-1">
                  Player {renderData.playerInputs.playerIndex + 1} (Port {renderData.playerSettings.port})
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <div class="text-gray-400">Character:</div>
                    <div>{characterNameByExternalId[renderData.playerSettings.externalCharacterId]}</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Facing Direction:</div>
                    <div class={playerState.facingDirection > 0 ? "text-green-400" : "text-red-400"}>
                      Raw: {playerState.facingDirection > 0 ? "Right (+1)" : "Left (-1)"}
                    </div>
                    <div class="text-xs text-gray-500">
                      Used in transforms: {(() => {
                        const facingTransform = renderData.transforms.find(t => t.includes('scale(') && t.includes(' 1)'));
                        return facingTransform?.includes('-1') ? 'Left (-1)' : 'Right (+1)';
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Action: {renderData.animationName}
                    </div>
                    <div class="text-xs text-gray-500">
                      Follows current: {(() => {
                        const actionName = renderData.animationName;
                        return (actionName.includes("Jump") || ["SpecialHi", "SpecialAirHi"].includes(actionName)) ? "Yes" : "No";
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Start-of-action: {(() => {
                        try {
                          const actionName = renderData.animationName;
                          const followsCurrent = actionName.includes("Jump") || ["SpecialHi", "SpecialAirHi"].includes(actionName);
                          if (followsCurrent) {
                            return "N/A (uses current)";
                          }
                          if (!replayStore.replayData) return "No replay data";
                          // Use absolute frame for getStartOfAction
                          // (getStartOfAction already expects absolute frame numbers in playerState)
                          if (!startOfActionPlayerUpdate || !startOfActionPlayerUpdate.state) {
                            return "No start data";
                          }
                          const startFacingDirection = startOfActionPlayerUpdate.state.facingDirection;
                          let debugInfo = `start frame: ${startOfActionFrame}, current frame: ${absoluteFrame}, playerState.frameNumber: ${playerState.frameNumber}`;
                          if (startOfActionFrame !== playerState.frameNumber) {
                            debugInfo += ` (backtracked from ${playerState.frameNumber})`;
                          }
                          const startState = startOfActionPlayerUpdate.state;
                          debugInfo += ` | start action: ${startState.actionStateId} (frame ${startState.actionStateFrameCounter})`;
                          debugInfo += ` | player: ${playerIndex}`;
                          const returnedPlayerIndex = startOfActionPlayerUpdate.playerIndex;
                          if (returnedPlayerIndex !== playerIndex) {
                            debugInfo += ` | WARNING: returned player ${returnedPlayerIndex} instead of ${playerIndex}!`;
                          }
                          const correctFrameNumber = startState.frameNumber;
                          if (correctFrameNumber !== startOfActionFrame) {
                            debugInfo += ` | FRAME MISMATCH: startState.frameNumber=${correctFrameNumber}`;
                          }
                          return `${startFacingDirection > 0 ? "Right (+1)" : "Left (-1)"} (${debugInfo})`;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Frame info: {(() => {
                        try {
                          if (!replayStore.replayData) return "No replay data";
                          // Use absolute frame for lookup
                          if (!currentFramePlayerUpdate || !currentFramePlayerUpdate.state) {
                            return "No current frame data";
                          }
                          const currentFrameState = currentFramePlayerUpdate.state;
                          return `replay frame: ${absoluteFrame}, playerState.frameNumber: ${playerState.frameNumber}, current frame action: ${currentFrameState.actionStateId} (frame ${currentFrameState.actionStateFrameCounter})`;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Cross-check: {(() => {
                        try {
                          const actionName = renderData.animationName;
                          const followsCurrent = actionName.includes("Jump") || ["SpecialHi", "SpecialAirHi"].includes(actionName);
                          if (followsCurrent) {
                            return "N/A (uses current)";
                          }
                          if (!replayStore.replayData) return "No replay data";
                          const otherPlayerIndex = playerIndex === 0 ? 1 : 0;
                          // Use absolute frame for cross-check
                          const otherPlayerAtStartFrame = getPlayerOnFrame(
                            otherPlayerIndex,
                            startOfActionFrame,
                            replayStore.replayData!
                          );
                          if (!otherPlayerAtStartFrame || !otherPlayerAtStartFrame.state) {
                            return "No other player data";
                          }
                          const otherPlayerState = otherPlayerAtStartFrame.state;
                          return `other player ${otherPlayerIndex} at frame ${startOfActionFrame}: action ${otherPlayerState.actionStateId} (frame ${otherPlayerState.actionStateFrameCounter}), facing ${otherPlayerState.facingDirection > 0 ? "Right" : "Left"}`;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Data verification: {(() => {
                        try {
                          const actionName = renderData.animationName;
                          const followsCurrent = actionName.includes("Jump") || ["SpecialHi", "SpecialAirHi"].includes(actionName);
                          if (followsCurrent) {
                            return "N/A (uses current)";
                          }
                          if (!replayStore.replayData) return "No replay data";
                          // Use absolute frame for verification
                          const frameData = replayStore.replayData.frames.find(f => f.frameNumber === startOfActionFrame);
                          if (!frameData) {
                            return "Frame not found";
                          }
                          const actualPlayerIndices = Object.keys(frameData.players).map(Number);
                          const player0Data = frameData.players[0];
                          const player1Data = frameData.players[1];
                          let verificationInfo = `frame ${startOfActionFrame}: players ${actualPlayerIndices.join(", ")}, requested ${playerIndex}`;
                          if (player0Data && player0Data.playerIndex !== 0) {
                            verificationInfo += ` | WARNING: frame.players[0] has playerIndex ${player0Data.playerIndex}!`;
                          }
                          if (player1Data && player1Data.playerIndex !== 1) {
                            verificationInfo += ` | WARNING: frame.players[1] has playerIndex ${player1Data.playerIndex}!`;
                          }
                          return verificationInfo;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Frame number analysis: {(() => {
                        try {
                          if (!replayStore.replayData) return "No replay data";
                          const currentFrameState = currentFramePlayerUpdate.state;
                          let analysis = `replay frame: ${absoluteFrame}, playerState.frameNumber: ${playerState.frameNumber}`;
                          if (currentFrameState.frameNumber !== playerState.frameNumber) {
                            analysis += ` | MISMATCH: current frame state says ${currentFrameState.frameNumber}`;
                          }
                          const firstFrame = replayStore.replayData.frames[0]?.frameNumber;
                          const lastFrame = replayStore.replayData.frames[replayStore.replayData.frames.length - 1]?.frameNumber;
                          analysis += ` | replay range: ${firstFrame}-${lastFrame}`;
                          return analysis;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Frame lookup debug: {(() => {
                        try {
                          if (!replayStore.replayData) return "No replay data";
                          const frameIndex = replayStore.replayData.frameIndexByNumber?.[absoluteFrame];
                          if (frameIndex === undefined) {
                            const availableFrames = Object.keys(replayStore.replayData.frameIndexByNumber || {}).map(Number).sort((a, b) => a - b);
                            const firstFew = availableFrames.slice(0, 5);
                            const lastFew = availableFrames.slice(-5);
                            return `Frame ${absoluteFrame} not found. Available frames: ${firstFew.join(", ")}...${lastFew.join(", ")} (total: ${availableFrames.length})`;
                          }
                          const frame = replayStore.replayData.frames[frameIndex];
                          if (!frame) {
                            return `No frame at index ${frameIndex}`;
                          }
                          const playerData = frame.players[playerIndex];
                          if (!playerData) {
                            return `No player ${playerIndex} data at frame ${absoluteFrame} (index ${frameIndex})`;
                          }
                          return `Frame ${absoluteFrame} -> index ${frameIndex} -> player ${playerIndex} found`;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Frame conversion test: {(() => {
                        try {
                          if (!replayStore.replayData) return "No replay data";
                          const correctFrameIndex = replayStore.replayData.frameIndexByNumber?.[absoluteFrame];
                          if (correctFrameIndex === undefined) {
                            return `Absolute frame ${absoluteFrame} not found in frameIndexByNumber`;
                          }
                          const correctFrame = replayStore.replayData.frames[correctFrameIndex];
                          if (!correctFrame) {
                            return `No frame at correct index ${correctFrameIndex}`;
                          }
                          return `relative ${relativeFrame} -> absolute ${absoluteFrame} -> index ${correctFrameIndex} ✓`;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                    <div class="text-xs text-gray-500">
                      Stub boundary check: {(() => {
                        try {
                          const startOfActionFrame = getStartOfAction(playerState, replayStore.replayData!);
                          const stubStartFrame = replayStore.replayData!.frames[0]?.frameNumber;
                          const stubEndFrame = replayStore.replayData!.frames[replayStore.replayData!.frames.length - 1]?.frameNumber;
                          let boundaryInfo = `stub range: ${stubStartFrame}-${stubEndFrame}, start-of-action: ${startOfActionFrame}`;
                          if (startOfActionFrame < stubStartFrame || startOfActionFrame > stubEndFrame) {
                            boundaryInfo += ` | WARNING: start-of-action frame outside stub boundaries!`;
                          }
                          return boundaryInfo;
                        } catch (e) {
                          return "Error: " + (e instanceof Error ? e.message : String(e));
                        }
                      })()}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-400">Position:</div>
                    <div>
                      X: {playerState.xPosition.toFixed(2)}
                    </div>
                    <div>
                      Y: {playerState.yPosition.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-400">Action State:</div>
                    <div>{renderData.animationName}</div>
                    <div class="text-xs text-gray-500">
                      ID: {playerState.actionStateId}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-400">Action Frame:</div>
                    <div>{playerState.actionStateFrameCounter.toFixed(2)}</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Stocks:</div>
                    <div>{playerState.stocksRemaining}</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Percent:</div>
                    <div>{Math.floor(playerState.percent)}%</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Hitstun:</div>
                    <div class={playerState.isInHitstun ? "text-red-400" : "text-gray-400"}>
                      {playerState.isInHitstun ? "Yes" : "No"}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-400">Hitlag:</div>
                    <div class={playerState.hitlagRemaining > 0 ? "text-yellow-400" : "text-gray-400"}>
                      {playerState.hitlagRemaining}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-400">Hurtbox State:</div>
                    <div class="capitalize">{playerState.hurtboxCollisionState}</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Shield Size:</div>
                    <div>{renderData.characterData.shieldSize.toFixed(2)}</div>
                  </div>
                  <div>
                    <div class="text-gray-400">Shield Offset:</div>
                    <div>
                      X: {renderData.characterData.shieldOffset[0].toFixed(2)}
                    </div>
                    <div>
                      Y: {renderData.characterData.shieldOffset[1].toFixed(2)}
                    </div>
                  </div>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-600">
                  <div class="text-gray-400 mb-1">Inputs:</div>
                  <div class="grid grid-cols-2 gap-1 text-xs">
                    <div>Joystick: ({renderData.playerInputs.processed.joystickX.toFixed(2)}, {renderData.playerInputs.processed.joystickY.toFixed(2)})</div>
                    <div>C-Stick: ({renderData.playerInputs.processed.cStickX.toFixed(2)}, {renderData.playerInputs.processed.cStickY.toFixed(2)})</div>
                    <div>A: {renderData.playerInputs.processed.a ? "✓" : "✗"}</div>
                    <div>B: {renderData.playerInputs.processed.b ? "✓" : "✗"}</div>
                    <div>X: {renderData.playerInputs.processed.x ? "✓" : "✗"}</div>
                    <div>Y: {renderData.playerInputs.processed.y ? "✓" : "✗"}</div>
                    <div>Z: {renderData.playerInputs.processed.z ? "✓" : "✗"}</div>
                    <div>L: {renderData.playerInputs.processed.lTriggerDigital ? "✓" : "✗"}</div>
                    <div>R: {renderData.playerInputs.processed.rTriggerDigital ? "✓" : "✗"}</div>
                    <div>Start: {renderData.playerInputs.processed.start ? "✓" : "✗"}</div>
                  </div>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
} 