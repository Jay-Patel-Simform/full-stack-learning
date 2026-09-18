import { z } from "zod";
import { TeamParams } from "./team.schema.ts";

export const CreateProject = z.object({ name: z.string().min(1).max(100) });

// ! Both ids in the URL. teamId scopes the gate and stops a delete reaching
// ! into another team's project.
export const ProjectParams = TeamParams.extend({
  projectId: z.coerce.number().int().positive(),
});

export const ProjectPublic = z.object({
  id: z.number(),
  name: z.string(),
  teamId: z.number(),
});

export type CreateProjectInput = z.infer<typeof CreateProject>;
export type ProjectParamsInput = z.infer<typeof ProjectParams>;
export const ProjectList = z.array(ProjectPublic);
