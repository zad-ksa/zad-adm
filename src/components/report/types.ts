export type Indicator = {
  id: string;
  code: string;
  name: string;
  status: string;
  owner: string;
  annualTarget: string | number;
  annualAchieved: string | number | null;
  q1Target: string | number; q1Achieved: string | number | null;
  q2Target: string | number; q2Achieved: string | number | null;
  q3Target: string | number; q3Achieved: string | number | null;
  q4Target: string | number; q4Achieved: string | number | null;
  postponed?: boolean;
  analysis?: string; // New field for report
  recommendations?: string; // New field for report
};

export type Goal = {
  id: string;
  code: string;
  name: string;
  indicators: Indicator[];
};

export type Axis = {
  id: string;
  name: string;
  goals: Goal[];
  prefix?: string;
};

export type ReportData = {
  generalAnalysis: string;
  generalRecommendations: string;
  dimensionAnalyses: Record<string, string>;
  dimensionRecommendations: Record<string, string>;
  goalAnalyses: Record<string, string>;
  indicatorAnalyses: Record<string, string>;
  indicatorRecommendations: Record<string, string>;
};
