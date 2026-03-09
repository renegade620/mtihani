export type Role = "DIRECTOR" | "TEACHER" | "STUDENT";

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

export type Worksheet = {
  id: number;
  title: string;
  instructions: string;
  questions: Question[];
};

export type Question = {
  id: number;
  prompt: string;
  max_score: string; // From API it comes as string "10.0"
};

export type AnswerVersion = {
  id: number;
  text: string;
  is_teacher_suggestion: boolean;
  author_username?: string;
};

export type Answer = {
  student: any;
  student_username: any;
  id?: number;
  question: number;
  current_text: string;
  status: "DRAFT" | "SUBMITTED";
  versions?: AnswerVersion[];
};

export type WorksheetGrade = {
  id: number;
  worksheet: number;
  student: number;
  student_username?: string;
  worksheet_title?: string;
  score_total: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  comment?: string;
};

export type Workbook = {
  id: number;
  title: string;
  description?: string;
  worksheets?: Worksheet[];
};
