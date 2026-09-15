import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpcClient } from "../trpc";
import type { UpdateAppSettingsInput, UpdateUserSettingsInput } from "@repo/schemas/settings";

// ---------------------------------------------------------------------------
// App Settings (key-value, scope: APP)
// ---------------------------------------------------------------------------

export const useAppSettings = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["appSettings"],
    queryFn: () => trpcClient.settings.getApp.query(),
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAppSettingsInput) => trpcClient.settings.updateApp.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appSettings"] });
    },
  });
};

// ---------------------------------------------------------------------------
// User Settings (key-value, scope: USER, self-scoped)
// ---------------------------------------------------------------------------

export const useUserSettings = () => {
  return useQuery({
    queryKey: ["userSettings"],
    queryFn: () => trpcClient.settings.getUser.query(),
    refetchOnWindowFocus: false,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateUserSettingsInput) => trpcClient.settings.updateUser.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    },
  });
};
