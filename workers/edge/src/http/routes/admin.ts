export function buildAdminBootstrapResponse(): Response {
  return Response.json({
    api_scope: "admin",
    pending_modules: [
      "center_auth",
      "center_admin",
      "global_admin",
      "audit_log"
    ]
  });
}

