import React from "react";


const QUESTIONS = [
  "24 giờ qua khu vực này mưa thế nào?",
  "24 giờ tới khu vực này có mưa lớn không?",
  "Thái Nguyên 3 ngày tới mưa thế nào?",
  "So sánh mưa thực đo và dự báo.",
];


export default function SuggestedQuestions({
  onSelect,
}) {
  return (
    <div className="ai-suggested">

      <div className="ai-suggested-title">
        Bạn có thể hỏi
      </div>

      <div className="ai-suggested-list">

        {QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className="ai-suggested-button"
            onClick={() => onSelect(question)}
          >
            {question}
          </button>
        ))}

      </div>

    </div>
  );
}