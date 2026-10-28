import {
  BookOpen, Briefcase, Calculator, CalendarDays, ChartColumn, CircleHelp,
  ClipboardList, NotebookTabs, ChartPie, FilePenLine,
  House, Repeat2, UserRound,
} from "./icons";

// A destination keeps its meaning in the menu, tabs, home shortcuts and empty states.
// Timer, status and action icons remain local to the controls they describe.
export const featureIcons = {
  home: House,
  deneme: ClipboardList,
  ders: BookOpen,
  history: ChartPie,
  profile: UserRound,
  score: Calculator,
  review: Repeat2,
  stats: ChartColumn,
  calendar: CalendarDays,
  petition: FilePenLine,
  report: NotebookTabs,
  faq: CircleHelp,
  jobs: Briefcase,
} as const;
