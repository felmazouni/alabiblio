import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app/AppRoutes";
import { UserOriginProvider } from "./features/location/UserOriginProvider";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <UserOriginProvider>
        <AppRoutes />
      </UserOriginProvider>
    </BrowserRouter>
  );
}

export default App;
