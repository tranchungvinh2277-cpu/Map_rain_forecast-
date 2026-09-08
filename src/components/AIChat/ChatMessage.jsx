import React from "react";


export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={
        isUser
          ? "ai-message ai-message-user"
          : "ai-message ai-message-assistant"
      }
    >

      {!isUser && (
        <div className="ai-chat-avatar-small">
          ✦
        </div>
      )}


      <div
        className={
          isUser
            ? "ai-message-bubble ai-message-user-bubble"
            : "ai-message-bubble ai-message-assistant-bubble"
        }
      >

        <div className="ai-message-text">
          {message.content
            .split("\n")
            .map((line, index) => (
              <React.Fragment key={index}>
                {line}

                {index <
                  message.content.split("\n").length - 1 && (
                  <br />
                )}
              </React.Fragment>
            ))}
        </div>


        {message.dataSource && (
          <div className="ai-message-source">
            Nguồn: {message.dataSource}
          </div>
        )}

      </div>

    </div>
  );
}