export interface Question {
  id: number;
  type: 'MCQ' | 'Descriptive';
  marks: number;
  difficulty: 'Easy' | 'Med' | 'Hard';
  text: string;
  options: string[];
  correctOption: number; // 0 for A, 1 for B, 2 for C, 3 for D
  explanation: string;
  topics: string[];
}
