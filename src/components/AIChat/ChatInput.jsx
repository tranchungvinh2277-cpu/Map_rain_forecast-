import React, { useState } from "react";


export default function ChatInput({
  onSend,
  disabled = false,
}) {
  const [value, setValue] = useState("");


  const submit = () => {
    const text = value.trim();

    if (!text || disabled) {
      return;
    }

    onSend(text);
    setValue("");
  };


  const handleKeyDown = (event) => {

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }

  };


  return (
    <div className="ai-chat-input-wrapper">

      <textarea
        className="ai-chat-input"
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
        onKeyDown={handleKeyDown}
        placeholder="Hỏi về tình hình mưa..."
        disabled={disabled}
        rows={1}
      />


      <button
        type="button"
        className="ai-chat-send-button"
        onClick={submit}
        disabled={
          disabled ||
          !value.trim()
        }
        title="Gửi câu hỏi"
      >
        ➤
      </button>

    </div>
  );
}