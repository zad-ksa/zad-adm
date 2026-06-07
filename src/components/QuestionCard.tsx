import { Question, Option } from "@/data/surveyData";

interface QuestionCardProps {
  question: Question;
  index: number;
  selectedOptionId?: string;
  onSelectOption: (optionId: string) => void;
}

export default function QuestionCard({
  question,
  index,
  selectedOptionId,
  onSelectOption,
}: QuestionCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full transition-all duration-200">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-white font-bold text-xs mt-1">
          {index}
        </span>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed">
          {question.text}
        </h3>
      </div>

      <div className="space-y-2.5 mt-4">
        {question.options.map((option: Option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`w-full text-right p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer
                ${
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-350 hover:bg-slate-50"
                }
              `}
            >
              <span className={`font-semibold text-sm sm:text-base ${isSelected ? "text-primary" : "text-slate-750"}`}>
                {option.text}
              </span>
              <div
                className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mr-3 transition-colors
                  ${
                    isSelected
                      ? "border-primary bg-primary text-white"
                      : "border-slate-350 bg-white group-hover:border-slate-400"
                  }
                `}
              >
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
