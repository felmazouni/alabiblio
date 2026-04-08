import type { PropsWithChildren } from "react";
import { UserOriginContext, useProvideUserOrigin } from "./userOriginContext";

export function UserOriginProvider({ children }: PropsWithChildren) {
  const value = useProvideUserOrigin();
  return (
    <UserOriginContext.Provider value={value}>
      {children}
    </UserOriginContext.Provider>
  );
}
