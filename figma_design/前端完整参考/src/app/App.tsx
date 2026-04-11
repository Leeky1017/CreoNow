import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "./components/layout";
import { Editor } from "./components/editor";
import { KnowledgeGraph } from "./components/knowledge-graph";
import { Characters } from "./components/characters";
import { Worldbuilding } from "./components/worldbuilding";
import { Dashboard } from "./components/dashboard";
import { Calendar as CalendarFull } from "./components/calendar";
import { Memory } from "./components/memory";
import { Scenarios } from "./components/scenarios";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      {
        index: true,
        Component: Editor,
      },
      {
        path: "dashboard",
        Component: Dashboard,
      },
      {
        path: "calendar",
        Component: CalendarFull,
      },
      {
        path: "scenarios",
        Component: Scenarios,
      },
      {
        path: "memory",
        Component: Memory,
      },
      {
        path: "kg",
        Component: KnowledgeGraph,
      },
      {
        path: "characters",
        Component: Characters,
      },
      {
        path: "worldbuilding",
        Component: Worldbuilding,
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
