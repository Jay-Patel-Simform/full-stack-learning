import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Project = { id: number; name: string; teamId: number };

// The key mirrors the URL, same as tasksScope. One entry per team.
export const projectsKey = (teamId: number) =>
  ["teams", teamId, "projects"] as const;

export function useProjects(teamId: number) {
  return useQuery({
    queryKey: projectsKey(teamId),
    queryFn: async () =>
      (await api.get<Project[]>(`/teams/${teamId}/projects`)).data,
  });
}

export function useCreateProject(teamId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await api.post<Project>(`/teams/${teamId}/projects`, { name })).data,
    // Not a hand-written cache append. The server orders by id and it is
    // the only thing that knows the new id -- lesson 26's rule, and there is
    // no paging here to make a refetch expensive.
    onSuccess: () =>
      client.invalidateQueries({ queryKey: projectsKey(teamId) }),
  });
}
