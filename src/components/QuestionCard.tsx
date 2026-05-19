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
    <div className="bg-white/70 backdrop-blur-md border border-white/20 shadow-sm hover:shadow-md rounded-2xl p-5 sm:p-6 w-full transition-all duration-300">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm border border-primary/20 mt-0.5">
          {index}
        </span>
        <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-relaxed">
          {question.text}
        </h3>
      </div>

      <div className="space-y-2 mt-4">
        {question.options.map((option: Option) => {
          const isSelected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`w-full text-right p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group
                ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                    : "border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50"
                }
              `}
            >
              <span
                className={`font-medium ${
                  isSelected ? "text-primary" : "text-slate-700"
                }`}
              >
                {option.text}
              </span>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 transition-colors
                  ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-slate-300 group-hover:border-primary/50"
                  }
                `}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 bg-white rounded-full animate-in zoom-in duration-200" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
