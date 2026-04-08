import { useContext } from "react";
import { UserOriginContext, type UserOriginContextValue } from "./userOriginContext";

export function useUserOrigin(): UserOriginContextValue {
  const context = useContext(UserOriginContext);

  if (!context) {
    throw new Error("user_origin_provider_missing");
  }

  return context;
}
