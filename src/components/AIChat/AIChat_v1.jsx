import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedQuestions from "./SuggestedQuestions";
import "./AIChat.css";
import {
    getForecastInfo,
    summarizeForecast,
    getNearestStation,
    getForecastAtLocation,
} from "../../services/forecastRainfallService";

const INITIAL_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Xin chào! Tôi là trợ lý AI về mưa. Bạn có thể hỏi về mưa thực đo, mưa dự báo GFS hoặc so sánh giữa thực đo và dự báo.",
};


function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}


/*
 * ---------------------------------------------------------
 * DEMO AI RESPONSE
 * ---------------------------------------------------------
 * Giai đoạn 1 chỉ mô phỏng câu trả lời.
 *
 * Giai đoạn 2 sẽ thay hàm này bằng:
 *
 * import { sendChatMessage } from "../../services/chatApi";
 *
 * ---------------------------------------------------------
 */

function generateDemoResponse(question, mapContext) {
  const q = question.toLowerCase();

  let locationText = "khu vực đang xem trên bản đồ";

  if (mapContext?.selectedProvince) {
    locationText = mapContext.selectedProvince;
  } else if (
    typeof mapContext?.lat === "number" &&
    typeof mapContext?.lon === "number"
  ) {
    locationText = `vị trí ${mapContext.lat.toFixed(3)}, ${mapContext.lon.toFixed(3)}`;
  }

  if (
    q.includes("24h") ||
    q.includes("24 giờ") ||
    q.includes("24 h")
  ) {
    return {
      content:
        `Đây là câu trả lời mô phỏng ở Giai đoạn 1. ` +
        `Đối với ${locationText}, hệ thống sẽ phân tích lượng mưa trong 24 giờ ` +
        `từ dữ liệu thực đo hoặc dự báo GFS tùy theo câu hỏi. ` +
        `Ở Giai đoạn 2, câu trả lời sẽ được lấy trực tiếp từ dữ liệu mưa thực tế và GFS.`,
      dataSource: "DEMO",
    };
  }

  if (
    q.includes("gfs") ||
    q.includes("dự báo") ||
    q.includes("forecast")
  ) {
    return {
      content:
        `Đây là phản hồi mô phỏng. Với câu hỏi này, AI sẽ sử dụng ` +
        `dữ liệu dự báo GFS 120 giờ để xác định tổng lượng mưa, ` +
        `thời điểm mưa lớn nhất và diễn biến mưa tại ${locationText}.`,
      dataSource: "GFS-DEMO",
    };
  }

  if (
    q.includes("thực đo") ||
    q.includes("quan trắc") ||
    q.includes("observed")
  ) {
    return {
      content:
        `Đây là phản hồi mô phỏng. Hệ thống sẽ sử dụng dữ liệu mưa ` +
        `thực đo đã qua QC để đánh giá tình hình mưa tại ${locationText}. ` +
        `Kết quả cuối cùng sẽ được AI diễn giải bằng ngôn ngữ tự nhiên, ` +
        `không hiển thị danh sách JSON của các trạm.`,
      dataSource: "OBS-DEMO",
    };
  }

  if (
    q.includes("so sánh") ||
    q.includes("so sanh")
  ) {
    return {
      content:
        `Đây là phản hồi mô phỏng. Hệ thống sẽ so sánh lượng mưa ` +
        `thực đo với lượng mưa GFS dự báo trong cùng khoảng thời gian ` +
        `tại ${locationText}, sau đó đưa ra nhận xét về mức độ phù hợp.`,
      dataSource: "COMPARE-DEMO",
    };
  }

  return {
    content:
      `Tôi đã nhận được câu hỏi: "${question}".\n\n` +
      `Trong Giai đoạn 1, đây là phản hồi mô phỏng. ` +
      `Hệ thống hiện đang ở ${locationText}. ` +
      `Khi kết nối dữ liệu thật, AI sẽ phân tích OBS và GFS ` +
      `để trả lời câu hỏi này.`,
    dataSource: "DEMO",
  };
}


export default function AIChat({
  mapContext = {},
  forecastContext = {},
}) {
  const [isOpen, setIsOpen] = useState(false);

  const [messages, setMessages] = useState([
    INITIAL_MESSAGE,
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [forecastInfo, setForecastInfo] = useState(null);

    const [forecastLoading, setForecastLoading] =
      useState(false);

    const [forecastError, setForecastError] =
      useState(null);
  const messagesEndRef = useRef(null);


  /*
   * ---------------------------------------------------------
   * TỰ ĐỘNG SCROLL CHAT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {

  async function loadForecastInfo() {

    try {

      setForecastLoading(true);
      setForecastError(null);

      const info =
        await getForecastInfo();

      console.log(
        "REAL GFS INFO:",
        info
      );

      setForecastInfo(info);

    } catch (error) {

      console.error(
        "GFS INFO ERROR:",
        error
      );

      setForecastError(
        error?.message ||
        "Không thể tải thông tin GFS."
      );

    } finally {

      setForecastLoading(false);

    }

  }

  loadForecastInfo();

}, []);

  /*
   * -------------------------------------------------------
   * GỬI CÂU HỎI
   * -------------------------------------------------------
   */
  const loadRealForecast = async () => {

  /*
   * ======================================================
   * 1. NẾU ĐANG CHỌN TRẠM
   * ======================================================
   */

  const selectedStation =
    mapContext?.selectedStation;


  if (
    selectedStation &&
    typeof selectedStation === "object" &&
    selectedStation.MaTram
  ) {

    const maTram =
      selectedStation.MaTram;


    const summary =
      await summarizeForecast(
        maTram,
        {
          hours: 24,
        }
      );


    return {

      type: "station",

      station:
        selectedStation,

      summary,

    };

  }


  /*
   * ======================================================
   * 2. NẾU CHỈ CÓ TỌA ĐỘ
   * ======================================================
   */

  if (
    typeof mapContext?.lat === "number" &&
    typeof mapContext?.lon === "number"
  ) {

    const location =
      await getForecastAtLocation(
        mapContext.lat,
        mapContext.lon,
        {
          hours: 24,
        }
      );


    return {

      type: "location",

      location,

    };

  }


  /*
   * ======================================================
   * 3. KHÔNG CÓ CONTEXT
   * ======================================================
   */

  return null;
};

const formatForecastResponse = (
  forecastResult
) => {

  if (!forecastResult) {

    return {
      content:
        "Hiện chưa có vị trí hoặc trạm nào được chọn trên bản đồ để phân tích dự báo GFS.",
      dataSource: "GFS",
    };

  }


  /*
   * ======================================================
   * FORECAST TẠI TRẠM
   * ======================================================
   */

  if (
    forecastResult.type === "station"
  ) {

    const summary =
      forecastResult.summary;


    if (!summary) {

      return {
        content:
          "Không tìm thấy dữ liệu dự báo GFS cho trạm đang chọn.",
        dataSource: "GFS",
      };

    }


    return {

      content:
        `Dự báo GFS 24 giờ tại trạm ` +
        `${summary.TenTram} (${summary.MaTram}), ` +
        `tỉnh ${summary.Tinh}:\n\n` +

        `• Tổng lượng mưa: ${summary.total ?? "—"} mm\n` +

        `• Lượng mưa nhỏ nhất: ${summary.min ?? "—"} mm\n` +

        `• Lượng mưa lớn nhất: ${summary.max ?? "—"} mm\n` +

        `• Lượng mưa trung bình: ${summary.mean ?? "—"} mm\n` +

        `• Thời điểm mưa lớn nhất: ${summary.peakTime ?? "—"}\n\n` +

        `Thời kỳ dự báo: ` +
        `${summary.startTime ?? "—"} → ` +
        `${summary.endTime ?? "—"}.`,

      dataSource: "GFS",

    };

  }


  /*
   * ======================================================
   * FORECAST TẠI VỊ TRÍ
   * ======================================================
   */

  if (
    forecastResult.type === "location"
  ) {

    const data =
      forecastResult.location;


    if (!data) {

      return {
        content:
          "Không tìm thấy trạm hoặc dữ liệu GFS gần vị trí đang chọn.",
        dataSource: "GFS",
      };

    }


    const station =
      data.nearestStation;

    const rainfall =
      data.rainfall;


    return {

      content:
        `Dự báo GFS 24 giờ tại vị trí ` +
        `${data.location.lat.toFixed(3)}, ` +
        `${data.location.lon.toFixed(3)}:\n\n` +

        `• Trạm gần nhất: ` +
        `${station.TenTram} (${station.MaTram})\n` +

        `• Khoảng cách: ` +
        `${station.distanceKm} km\n` +

        `• Tổng lượng mưa: ` +
        `${rainfall.total ?? "—"} mm\n` +

        `• Lượng mưa lớn nhất: ` +
        `${rainfall.max ?? "—"} mm\n` +

        `• Thời điểm mưa lớn nhất: ` +
        `${rainfall.peakTime ?? "—"}\n\n` +

        `Thời kỳ dự báo: ` +
        `${rainfall.startTime ?? "—"} → ` +
        `${rainfall.endTime ?? "—"}.`,

      dataSource: "GFS",

    };

  }


  return {

    content:
      "Không xác định được dữ liệu dự báo GFS.",

    dataSource: "GFS",

  };

};



  const handleSend = async (question) => {

  const text =
    question?.trim();


  if (
    !text ||
    isLoading
  ) {
    return;
  }


  const userMessage = {

    id:
      generateId(),

    role:
      "user",

    content:
      text,

  };


  setMessages((prev) => [

    ...prev,

    userMessage,

  ]);


  setIsLoading(true);


  try {

    /*
     * ==================================================
     * LẤY DỮ LIỆU GFS THẬT
     * ==================================================
     */

    const forecastResult =
      await loadRealForecast();


    /*
     * ==================================================
     * CHUYỂN DỮ LIỆU THÀNH CÂU TRẢ LỜI
     * ==================================================
     */

    const result =
      formatForecastResponse(
        forecastResult
      );


    const assistantMessage = {

      id:
        generateId(),

      role:
        "assistant",

      content:
        result.content,

      dataSource:
        result.dataSource,

    };


    setMessages((prev) => [

      ...prev,

      assistantMessage,

    ]);

  } catch (error) {

    console.error(
      "AI Chat GFS error:",
      error
    );


    setMessages((prev) => [

      ...prev,

      {

        id:
          generateId(),

        role:
          "assistant",

        content:
          "Xin lỗi, không thể lấy dữ liệu dự báo GFS lúc này.",

        error:
          true,

      },

    ]);

  } finally {

    setIsLoading(false);

  }

};


  /*
   * -------------------------------------------------------
   * XÓA CUỘC HỘI THOẠI
   * -------------------------------------------------------
   */
  const handleClear = () => {
    setMessages([
      INITIAL_MESSAGE,
    ]);
  };


  /*
   * -------------------------------------------------------
   * CÂU HỎI GỢI Ý
   * -------------------------------------------------------
   */
  const handleSuggestedQuestion = (question) => {
    handleSend(question);
  };


  return (
    <>
      {/* ==================================================
          NÚT MỞ CHAT
          ================================================== */}

      {!isOpen && (
        <button
          type="button"
          className="ai-chat-floating-button"
          onClick={() => setIsOpen(true)}
          title="Trợ lý AI về mưa"
          aria-label="Mở trợ lý AI"
        >
          <span className="ai-chat-icon">
            ✦
          </span>

          <span className="ai-chat-floating-text">
            AI
          </span>
        </button>
      )}


      {/* ==================================================
          CHAT PANEL
          ================================================== */}

      {isOpen && (
        <div className="ai-chat-panel">

          {/* HEADER */}

          <div className="ai-chat-header">

            <div className="ai-chat-header-left">

              <div className="ai-chat-avatar">
                ✦
              </div>

              <div>
                <div className="ai-chat-title">
                  Trợ lý AI về mưa
                </div>

                <div className="ai-chat-status">
                  <span className="ai-status-dot" />
                  Sẵn sàng
                </div>
              </div>

            </div>


            <div className="ai-chat-header-actions">

              <button
                type="button"
                className="ai-chat-header-button"
                onClick={handleClear}
                title="Xóa cuộc hội thoại"
              >
                ↻
              </button>

              <button
                type="button"
                className="ai-chat-header-button"
                onClick={() => setIsOpen(false)}
                title="Đóng"
              >
                ×
              </button>

            </div>

          </div>


          {/* MAP CONTEXT */}

          {(mapContext?.selectedProvince ||
            mapContext?.selectedStation ||
            typeof mapContext?.lat === "number") && (

            <div className="ai-chat-context">

              <div className="ai-context-label">
                VỊ TRÍ ĐANG XEM
              </div>

              <div className="ai-context-value">

                {mapContext?.selectedProvince && (
                  <span>
                    {mapContext.selectedProvince}
                  </span>
                )}

                {mapContext?.selectedStation && (
                  <span>
                    {typeof mapContext.selectedStation === "object"
                      ? (
                        mapContext.selectedStation.TenTram ||
                        mapContext.selectedStation.MaTram ||
                        "Trạm đang chọn"
                      )
                      : mapContext.selectedStation}
                  </span>
                )}

                {!mapContext?.selectedProvince &&
                  !mapContext?.selectedStation &&
                  typeof mapContext?.lat === "number" && (
                    <span>
                      {mapContext.lat.toFixed(3)}
                      {" , "}
                      {mapContext.lon?.toFixed(3)}
                    </span>
                  )}

              </div>

            </div>
          )}


          {/* MESSAGE AREA */}

          <div className="ai-chat-messages">

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))}


            {/* LOADING */}

            {isLoading && (
              <div className="ai-message ai-message-assistant">

                <div className="ai-chat-avatar-small">
                  ✦
                </div>

                <div className="ai-message-content">

                  <div className="ai-typing">

                    <span />
                    <span />
                    <span />

                  </div>

                </div>

              </div>
            )}


            {/* SUGGESTIONS */}

            {messages.length === 1 && !isLoading && (
              <SuggestedQuestions
                onSelect={handleSuggestedQuestion}
              />
            )}

            <div ref={messagesEndRef} />

          </div>


          {/* INPUT */}

          <ChatInput
            onSend={handleSend}
            disabled={isLoading}
          />

        </div>
      )}
    </>
  );
}