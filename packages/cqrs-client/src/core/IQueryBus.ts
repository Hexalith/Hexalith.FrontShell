import type { SubmitQueryRequest } from "./types";
import type { z } from "zod";


export interface IQueryBus {
  query<T>(request: SubmitQueryRequest, schema: z.ZodType<T>): Promise<T>;
}
