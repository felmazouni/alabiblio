import { handleRequest } from "./http/app";
import type { EdgeEnv } from "./env";

export default {
  async fetch(request: Request, env: EdgeEnv, ctx: { waitUntil: (p: Promise<unknown>) => void }): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};

