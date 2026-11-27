import { create } from "zustand";

type CampusState = {
  connectEnabled: boolean; // opt-in, deliberately not persisted
  simLocation: string;
  selectedBuildingId: string | null;
  activeChatId: string | null;
  setConnectEnabled: (v: boolean) => void;
  setSimLocation: (key: string) => void;
  selectBuilding: (id: string | null) => void;
  setActiveChat: (id: string | null) => void;
  reset: () => void;
};

const initial = { connectEnabled: false, simLocation: "bibliothek", selectedBuildingId: null, activeChatId: null };

export const useCampusStore = create<CampusState>((set) => ({
  ...initial,
  setConnectEnabled: (connectEnabled) => set({ connectEnabled }),
  setSimLocation: (simLocation) => set({ simLocation }),
  selectBuilding: (selectedBuildingId) => set({ selectedBuildingId }),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  reset: () => set(initial),
}));
