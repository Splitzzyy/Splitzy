import { create } from "zustand";
import { groupsApi } from "@/services/api/groups.api";
import type {
  UserGroupInfo,
  GroupOverview,
  CreateGroupRequest,
  AddUsersToGroupRequest,
} from "@/types/api.types";

interface GroupsState {
  groups: UserGroupInfo[];
  currentGroup: GroupOverview | null;
  isLoading: boolean;
  error: string | null;

  fetchGroups: () => Promise<void>;
  fetchGroupOverview: (groupId: number) => Promise<void>;
  createGroup: (data: CreateGroupRequest) => Promise<void>;
  addUsersToGroup: (
    groupId: number,
    data: AddUsersToGroupRequest
  ) => Promise<void>;
  deleteGroup: (groupId: number) => Promise<void>;
  clearCurrentGroup: () => void;
}

export const useGroupsStore = create<GroupsState>((set) => ({
  groups: [],
  currentGroup: null,
  isLoading: false,
  error: null,

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupsApi.getAllGroups();
      set({ groups: response.data ?? [], isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to load groups",
        isLoading: false,
      });
    }
  },

  fetchGroupOverview: async (groupId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await groupsApi.getGroupOverview(groupId);
      set({ currentGroup: response.data ?? null, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Failed to load group",
        isLoading: false,
      });
    }
  },

  createGroup: async (data) => {
    try {
      await groupsApi.createGroup(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to create group"
      );
    }
  },

  addUsersToGroup: async (groupId, data) => {
    try {
      await groupsApi.addUsersToGroup(groupId, data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to add members"
      );
    }
  },

  deleteGroup: async (groupId) => {
    try {
      await groupsApi.deleteGroup(groupId);
      set((state) => ({
        groups: state.groups.filter((g) => g.groupId !== groupId),
      }));
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to delete group"
      );
    }
  },

  clearCurrentGroup: () => set({ currentGroup: null }),
}));
