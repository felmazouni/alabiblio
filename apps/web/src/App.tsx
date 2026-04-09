import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./app/AppRoutes";
import { UserOriginProvider } from "./features/location/UserOriginProvider";
import { ThemeProvider } from "./features/theme/ThemeProvider";
import "./App.css";
import "./styles/product.css";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserOriginProvider>
          <AppRoutes />
        </UserOriginProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
