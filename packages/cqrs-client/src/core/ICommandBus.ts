import type { SubmitCommandRequest, SubmitCommandResponse } from "./types";

export interface ICommandBus {
  send(command: SubmitCommandRequest): Promise<SubmitCommandResponse>;
}
