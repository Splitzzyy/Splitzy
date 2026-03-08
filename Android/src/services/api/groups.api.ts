import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type {
  ApiResponse,
  CreateGroupRequest,
  AddUsersToGroupRequest,
  UserGroupInfo,
  GroupOverview,
} from "@/types/api.types";

export const groupsApi = {
  getAllGroups: () =>
    apiClient.get<ApiResponse<UserGroupInfo[]>>(ENDPOINTS.ALL_GROUPS),

  getGroupOverview: (groupId: number) =>
    apiClient.get<ApiResponse<GroupOverview>>(
      `${ENDPOINTS.GROUP_OVERVIEW}/${groupId}`
    ),

  createGroup: (data: CreateGroupRequest) =>
    apiClient.post(ENDPOINTS.CREATE_GROUP, data),

  addUsersToGroup: (groupId: number, data: AddUsersToGroupRequest) =>
    apiClient.post(`${ENDPOINTS.ADD_USERS_TO_GROUP}/${groupId}`, data),

  deleteGroup: (groupId: number) =>
    apiClient.delete(`${ENDPOINTS.DELETE_GROUP}/${groupId}`),
};
