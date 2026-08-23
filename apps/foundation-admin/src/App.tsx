import { Refine, Authenticated } from "@refinedev/core";
import routerProvider from "@refinedev/react-router";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./pages/login";
import { Dashboard } from "./pages/dashboard";
import { UserList, UserShow, UserEdit } from "./pages/users";
import { WalletList, WalletShow } from "./pages/wallets";
import { TransactionList, TransactionShow } from "./pages/transactions";
import { LaunchpadProjectList, LaunchpadProjectShow, LaunchpadProjectEdit } from "./pages/launchpad-projects";

function App() {
  return (
    <BrowserRouter>
      <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          authProvider={authProvider}
          resources={[
            {
              name: "dashboard",
              list: "/",
              meta: {
                label: "Dashboard",
                icon: "dashboard",
              },
            },
            {
              name: "user",
              list: "/users",
              create: "/users/create",
              edit: "/users/edit/:id",
              show: "/users/show/:id",
              meta: {
                canDelete: true,
                label: "Users",
              },
            },
            {
              name: "wallet",
              list: "/wallets",
              show: "/wallets/show/:id",
              meta: {
                canDelete: false,
                label: "Wallets",
              },
            },
            {
              name: "transaction",
              list: "/transactions",
              show: "/transactions/show/:id",
              meta: {
                canDelete: false,
                label: "Transactions",
              },
            },
            {
              name: "launchpad-project",
              list: "/launchpad-projects",
              edit: "/launchpad-projects/edit/:id",
              show: "/launchpad-projects/show/:id",
              meta: {
                canDelete: true,
                label: "Launchpad",
              },
            },
          ]}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Authenticated key="authenticated" fallback={<Navigate to="/login" />}>
                  <AppLayout />
                </Authenticated>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/users">
                <Route index element={<UserList />} />
                <Route path="show/:id" element={<UserShow />} />
                <Route path="edit/:id" element={<UserEdit />} />
                <Route path="create" element={<UserEdit />} />
              </Route>
              <Route path="/wallets">
                <Route index element={<WalletList />} />
                <Route path="show/:id" element={<WalletShow />} />
              </Route>
              <Route path="/transactions">
                <Route index element={<TransactionList />} />
                <Route path="show/:id" element={<TransactionShow />} />
              </Route>
              <Route path="/launchpad-projects">
                <Route index element={<LaunchpadProjectList />} />
                <Route path="show/:id" element={<LaunchpadProjectShow />} />
                <Route path="edit/:id" element={<LaunchpadProjectEdit />} />
              </Route>
            </Route>
          </Routes>
        </Refine>
    </BrowserRouter>
  );
}

export default App;
