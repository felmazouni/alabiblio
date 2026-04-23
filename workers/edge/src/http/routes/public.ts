export function buildPublicBootstrapResponse(): Response {
  return Response.json({
    api_scope: "public",
    pending_modules: []
  });
}
