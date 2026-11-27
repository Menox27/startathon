import { format } from "date-fns";
import { create } from "zustand";
import type { CampusId } from "./campus";

type CampusState = {
  connectEnabled: boolean; // opt-in, deliberately not persisted
  simLocation: string;
  campus: CampusId;
  day: string; // yyyy-MM-dd, shared by calendar and map highlight
  selectedBuildingId: string | null;
  openEventId: string | null;
  activeChatId: string | null;
  setConnectEnabled: (v: boolean) => void;
  setSimLocation: (key: string) => void;
  setCampus: (campus: CampusId) => void;
  setDay: (day: string) => void;
  selectBuilding: (id: string | null) => void;
  openEvent: (id: string | null) => void;
  setActiveChat: (id: string | null) => void;
  reset: () => void;
};

const initial = () => ({
  connectEnabled: false,
  simLocation: "bibliothek",
  campus: "ignaz" as CampusId,
  day: format(new Date(), "yyyy-MM-dd"),
  selectedBuildingId: null,
  openEventId: null,
  activeChatId: null,
});

export const useCampusStore = create<CampusState>((set) => ({
  ...initial(),
  setConnectEnabled: (connectEnabled) => set({ connectEnabled }),
  setSimLocation: (simLocation) => set({ simLocation }),
  setCampus: (campus) => set({ campus, selectedBuildingId: null }),
  setDay: (day) => set({ day }),
  selectBuilding: (selectedBuildingId) => set({ selectedBuildingId }),
  openEvent: (openEventId) => set({ openEventId }),
  setActiveChat: (activeChatId) => set({ activeChatId }),
  reset: () => set(initial()),
}));
