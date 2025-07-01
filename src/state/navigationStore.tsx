import { createSignal } from "solid-js";

export type Sidebar = "local replays" | "cloud replays" | "clips" | "inputs" | "aws";

export const [currentSidebar, setSidebar] =
  createSignal<Sidebar>("cloud replays");
