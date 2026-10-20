// /app/course (the online course, phase-online O1). Loads the course styles;
// the /app layout above already guards sign-in and the survey gate.

import "@/components/course/course.css";

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
