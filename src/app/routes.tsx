import { createHashRouter } from "react-router";
import Root from "./components/Root";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Access from "./components/Access";
import Membership from "./components/Membership";
import Classes from "./components/Classes";
import Routines from "./components/Routines";
import Progress from "./components/Progress";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import Notifications from "./components/Notifications";
import EditCredentials from "./components/EditCredentials";

export const router = createHashRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "access", Component: Access },
      { path: "membership", Component: Membership },
      { path: "classes", Component: Classes },
      { path: "routines", Component: Routines },
      { path: "progress", Component: Progress },
      { path: "profile", Component: Profile },
      { path: "profile/edit", Component: EditProfile },
      { path: "profile/security", Component: EditCredentials },
      { path: "notifications", Component: Notifications },
    ],
  },
]);
