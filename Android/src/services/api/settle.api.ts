import { apiClient } from "./client";
import { ENDPOINTS } from "@/constants/endpoints";
import type { SettleUpDTO } from "@/types/api.types";

export const settleApi = {
  settleUp: (data: SettleUpDTO) =>
    apiClient.post(ENDPOINTS.SETTLE_UP, data),
};
