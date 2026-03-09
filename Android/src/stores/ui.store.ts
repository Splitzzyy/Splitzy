import { create } from "zustand";

interface ToastState {
  message: string;
  type: "success" | "error" | "info" | "warning";
  visible: boolean;
}

interface UIState {
  toast: ToastState;
  showToast: (
    message: string,
    type?: ToastState["type"]
  ) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toast: { message: "", type: "info", visible: false },

  showToast: (message, type = "info") =>
    set({ toast: { message, type, visible: true } }),

  hideToast: () =>
    set((state) => ({
      toast: { ...state.toast, visible: false },
    })),
}));
