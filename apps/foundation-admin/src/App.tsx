import { lazy, Suspense, type ReactNode } from "react";
import { Refine, Authenticated, CanAccess } from "@refinedev/core";
import routerProvider, { UnsavedChangesNotifier } from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { dataProvider } from "./dataProvider";
import { authProvider } from "./authProvider";
import { accessControlProvider } from "./accessControl";
import { notificationProvider } from "./notifications/toastStore";
import { Toaster } from "./notifications/Toaster";
import { queryClient } from "./queryClient";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingSpinner } from "./components/ui/loading";
import { Login } from "./pages/login";
import { NotFound, Forbidden } from "./pages/errors";

// Route-level code splitting: each page (and recharts for the dashboard) loads on demand.
const Dashboard = lazy(() => import("./pages/dashboard").then((m) => ({ default: m.Dashboard })));
const UserList = lazy(() => import("./pages/users/list").then((m) => ({ default: m.UserList })));
const UserShow = lazy(() => import("./pages/users/show").then((m) => ({ default: m.UserShow })));
const UserEdit = lazy(() => import("./pages/users/edit").then((m) => ({ default: m.UserEdit })));
const WalletList = lazy(() => import("./pages/wallets/list").then((m) => ({ default: m.WalletList })));
const WalletShow = lazy(() => import("./pages/wallets/show").then((m) => ({ default: m.WalletShow })));
const TransactionList = lazy(() =>
  import("./pages/transactions/list").then((m) => ({ default: m.TransactionList })),
);
const TransactionShow = lazy(() =>
  import("./pages/transactions/show").then((m) => ({ default: m.TransactionShow })),
);
const LaunchpadProjectList = lazy(() =>
  import("./pages/launchpad-projects/list").then((m) => ({ default: m.LaunchpadProjectList })),
);
const LaunchpadProjectShow = lazy(() =>
  import("./pages/launchpad-projects/show").then((m) => ({ default: m.LaunchpadProjectShow })),
);
const LaunchpadProjectEdit = lazy(() =>
  import("./pages/launchpad-projects/edit").then((m) => ({ default: m.LaunchpadProjectEdit })),
);

const RequireAccess = ({ resource, action, children }: { resource: string; action: string; children: ReactNode }) => (
  <CanAccess resource={resource} action={action} fallback={<Forbidden />}>
    {children}
  </CanAccess>
);

const FullPageSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <LoadingSpinner />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProvider}
        authProvider={authProvider}
        accessControlProvider={accessControlProvider}
        notificationProvider={notificationProvider}
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
            edit: "/users/edit/:id",
            show: "/users/show/:id",
            meta: {
              canDelete: false,
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
          disableTelemetry: true,
          reactQuery: { clientConfig: queryClient },
        }}
      >
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route
              path="/login"
              element={
                <Authenticated key="login-page" fallback={<Login />} loading={<FullPageSpinner />}>
                  <Navigate to="/" replace />
                </Authenticated>
              }
            />
            <Route
              element={
                <Authenticated key="authenticated" fallback={<Navigate to="/login" replace />} loading={<FullPageSpinner />}>
                  <AppLayout />
                </Authenticated>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="/users">
                <Route index element={<UserList />} />
                <Route path="show/:id" element={<UserShow />} />
                <Route
                  path="edit/:id"
                  element={
                    <RequireAccess resource="user" action="edit">
                      <UserEdit />
                    </RequireAccess>
                  }
                />
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
                <Route
                  path="edit/:id"
                  element={
                    <RequireAccess resource="launchpad-project" action="edit">
                      <LaunchpadProjectEdit />
                    </RequireAccess>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <UnsavedChangesNotifier />
        <Toaster />
      </Refine>
    </BrowserRouter>
  );
}

export default App;
