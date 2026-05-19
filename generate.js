const fs = require('fs');
const json = JSON.parse(fs.readFileSync('C:/Users/User/Downloads/Readiness scale.json', 'utf8'));

const standardOptions = [
  { id: 'o5', text: 'متوفر بشكل كامل وممنهج', score: 5 },
  { id: 'o4', text: 'متوفر بشكل جيد مع بعض الثغرات', score: 4 },
  { id: 'o3', text: 'متوفر جزئياً', score: 3 },
  { id: 'o2', text: 'ضعيف', score: 2 },
  { id: 'o1', text: 'غير متوفر', score: 1 },
];

const tsContent = `export interface Option {
  id: string;
  text: string;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
}

export interface Section {
  id: number;
  title: string;
  maxScore: number;
  questions: Question[];
}

export const surveyData: Section[] = ${JSON.stringify(json.sections.map(sec => ({
  id: sec.id,
  title: sec.title,
  maxScore: sec.max_score,
  questions: sec.questions.map(q => ({
    id: 'q' + q.id,
    text: q.text,
    options: standardOptions
  }))
})), null, 2)};
`;

fs.writeFileSync('C:/Users/User/Desktop/zad_istbian/src/data/surveyData.ts', tsContent);
