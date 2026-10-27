import {
  BookOpen, Briefcase, Calculator, CalendarDays, ChartColumn, CircleHelp,
  ClipboardList, ClipboardPenLine, FileChartColumn, FilePenLine,
  House, ListRestart, UserRound,
} from "./icons";

// A destination keeps its meaning in the menu, tabs, home shortcuts and empty states.
// Timer, status and action icons remain local to the controls they describe.
export const featureIcons = {
  home: House,
  deneme: ClipboardList,
  ders: BookOpen,
  history: FileChartColumn,
  profile: UserRound,
  score: Calculator,
  review: ListRestart,
  stats: ChartColumn,
  calendar: CalendarDays,
  petition: FilePenLine,
  report: ClipboardPenLine,
  faq: CircleHelp,
  jobs: Briefcase,
} as const;
