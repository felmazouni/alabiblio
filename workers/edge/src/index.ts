import { handleRequest } from "./http/app";
import type { EdgeEnv } from "./env";

export default {
  async fetch(request: Request, env: EdgeEnv): Promise<Response> {
    return handleRequest(request, env);
  }
};

