import React, {
    useEffect,
    useRef,
    useState,
} from "react";

import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import SuggestedQuestions from "./SuggestedQuestions";

import "./AIChat.css";


// ==========================================================
// FORECAST ENGINE
// ==========================================================

import {
    queryForecast,
    formatForecastAnswer,
} from "../../services/forecastQueryEngine";


// ==========================================================
// CFS ENGINE
// ==========================================================

import {
    extractCFSProvince,
    summarizeCFSProvince,
    queryCFSStation,
    formatCFSAnswer,
    formatCFSProvinceAnswer
} from "../../services/cfsQueryEngine";

// ==========================================================
// OBSERVED ENGINE
// ==========================================================

import {
    queryObserved,
    formatObservedAnswer,
    detectRainDataSource,
} from "../../services/observedQueryEngine";


// ==========================================================
// OBSERVED CONTEXT
// ==========================================================

import {
    getRainAIContext,
} from "../../services/aiRainContext";


// ==========================================================
// AI LOG → CLOUDFLARE WORKER + D1
// ==========================================================

import {
    logAiQuery,
} from "../../services/aiLog";


// ==========================================================
// INITIAL MESSAGE
// ==========================================================

const INITIAL_MESSAGE = {

    id: "welcome",

    role: "assistant",

    content:
        "Xin chào! Tôi là trợ lý AI về mưa. " +
        "Bạn có thể hỏi về mưa thực đo, " +
        "mưa dự báo GFS theo ngày/giờ, " +
        "hoặc dự báo CFS theo tháng.",

};


// ==========================================================
// GENERATE ID
// ==========================================================

function generateId() {

    return (
        `${Date.now()}-` +
        `${Math.random()
            .toString(36)
            .substring(2, 9)}`
    );

}


// ==========================================================
// NORMALIZE TEXT
// ==========================================================
//
// Dùng riêng cho việc routing engine.
// Không thay đổi text gốc mà người dùng nhập.
// ==========================================================

function normalizeRainQuestion(question) {

    return String(question || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


// ==========================================================
// DETECT RAIN ENGINE
// ==========================================================
//
// QUY TẮC:
//
// 1. OBSERVED
//    Thời gian đã xảy ra:
//      - qua
//      - trước
//      - hôm qua
//      - đã mưa
//      - thực đo
//      - thực tế
//
// 2. GFS
//    Dự báo ngày / giờ:
//      - tới
//      - sắp tới
//      - hôm nay
//      - ngày mai
//      - giờ tới
//      - ngày tới
//
// 3. CFS
//    Dự báo theo tháng:
//      - CFS
//      - CFSv2
//      - tháng
//
// ----------------------------------------------------------
// ƯU TIÊN:
//
// OBSERVED > GFS > CFS
//
// Ví dụ:
//
// "Trong tháng này 24 giờ qua mưa thế nào?"
//      → OBSERVED
//
// "Trong tháng này 24 giờ tới mưa thế nào?"
//      → GFS
//
// "Dự báo mưa tháng 10"
//      → CFS
//
// "CFS tháng 10"
//      → CFS
// ==========================================================
// DETECT RAIN ENGINE
// ==========================================================

function detectRainEngine(question) {

    const q =
        normalizeRainQuestion(
            question
        );

    console.log(
        "[detectRainEngine] QUESTION:",
        question
    );

    console.log(
        "[detectRainEngine] NORMALIZED:",
        q
    );


    // ======================================================
    // 1. OBSERVED
    // ======================================================

    const isObserved =

        q.includes("qua") ||

        q.includes("truoc") ||

        q.includes("hom qua") ||

        q.includes("da mua") ||

        q.includes("thuc do") ||

        q.includes("thuc te");


    if (isObserved) {

        console.log(
            "[detectRainEngine] RESULT: OBSERVED"
        );

        return "OBSERVED";

    }


    // ======================================================
    // 2. CFS
    // ======================================================

    const isCFS =

        /\bcfs(?:v2)?\b/.test(q) ||

        q.includes("thang");


    if (isCFS) {

        console.log(
            "[detectRainEngine] RESULT: CFS"
        );

        return "CFS";

    }


    // ======================================================
    // 3. GFS
    // ======================================================

    const isGFS =

        q.includes("gio toi") ||

        q.includes("ngay toi") ||

        q.includes("sap toi") ||

        q.includes("hom nay") ||

        q.includes("ngay mai");


    if (isGFS) {

        console.log(
            "[detectRainEngine] RESULT: GFS"
        );

        return "GFS";

    }


    // ======================================================
    // 4. DEFAULT
    // ======================================================

    console.log(
        "[detectRainEngine] RESULT: GFS (DEFAULT)"
    );

    return "GFS";

}


// ==========================================================
// COMPONENT
// ==========================================================

export default function AIChat({

    mapContext = {},

    forecastContext = {},

}) {

    // ========================================================
    // STATE
    // ========================================================

    const [
        isOpen,
        setIsOpen
    ] = useState(false);


    const [
        messages,
        setMessages
    ] = useState([
        INITIAL_MESSAGE
    ]);


    const [
        isLoading,
        setIsLoading
    ] = useState(false);


    const [
        observedContext,
        setObservedContext
    ] = useState(null);


    const [
        observedLoading,
        setObservedLoading
    ] = useState(false);


    // ========================================================
    // REF
    // ========================================================

    const messagesEndRef =
        useRef(null);


    // ========================================================
    // SELECTED STATION CODE
    // ========================================================

    const selectedMaTram =

        typeof mapContext?.selectedStation ===
        "object"

            ? mapContext
                ?.selectedStation
                ?.MaTram

            : mapContext
                ?.selectedStation;


    // ========================================================
    // AUTO SCROLL
    // ========================================================

    useEffect(() => {

        messagesEndRef.current?.scrollIntoView({

            behavior:
                "smooth",

        });

    }, [

        messages,

        isLoading,

    ]);


    // ========================================================
    // LOAD OBSERVED RAINFALL
    // ========================================================

    useEffect(() => {

        if (!selectedMaTram) {

            setObservedContext(null);

            return;

        }


        let cancelled = false;


        async function loadObserved() {

            setObservedLoading(true);


            try {

                const context =
                    await getRainAIContext(
                        selectedMaTram
                    );


                if (!cancelled) {

                    setObservedContext(
                        context?.observed ||
                        null
                    );

                }

            } catch (error) {

                console.error(
                    "[AIChat] Observed rainfall context error:",
                    error
                );


                if (!cancelled) {

                    setObservedContext(null);

                }

            } finally {

                if (!cancelled) {

                    setObservedLoading(false);

                }

            }

        }


        loadObserved();


        return () => {

            cancelled = true;

        };

    }, [

        selectedMaTram

    ]);


    // ========================================================
    // SEND QUESTION
    // ========================================================

    const handleSend = async (
        question
    ) => {

        const text =
            question?.trim();


        if (
            !text ||
            isLoading
        ) {

            return;

        }


        // ====================================================
        // USER MESSAGE
        // ====================================================

        const userMessage = {

            id:
                generateId(),

            role:
                "user",

            content:
                text,

        };


        setMessages(
            prev => [

                ...prev,

                userMessage,

            ]
        );


        setIsLoading(true);


        try {

            // ==================================================
            // COMPLETE CONTEXT
            // ==================================================

            const context = {

                ...mapContext,

                ...forecastContext,

                observedRainfall:
                    observedContext,

            };


            // ==================================================
            // DETECT DATA ENGINE
            // ==================================================
            //
            // Đây là routing chính:
            //
            // OBSERVED → thời gian đã qua
            // GFS      → ngày / giờ tới
            // CFS      → theo tháng
            // ==================================================

            const rainEngine =
                detectRainEngine(
                    text
                );


            // ==================================================
            // EXISTING OBSERVED DETECTION
            // ==================================================
            //
            // Giữ detectRainDataSource để tương thích với
            // observedQueryEngine hiện tại.
            // ==================================================

            const detectedDataSource =
                detectRainDataSource(
                    text
                );


            // ==================================================
            // FINAL DATA SOURCE
            // ==================================================
            //
            // rainEngine có quyền ưu tiên.
            //
            // Riêng trường hợp không phải CFS/GFS rõ ràng,
            // vẫn cho phép observedQueryEngine nhận diện
            // OBSERVED.
            // ==================================================

            const dataSource =

                rainEngine === "CFS"

                    ? "CFS"

                    : rainEngine === "OBSERVED"

                        ? "OBSERVED"

                        : detectedDataSource ===
                            "OBSERVED"

                            ? "OBSERVED"

                            : "GFS";


            // ==================================================
            // DEBUG
            // ==================================================

            console.log(
                "================================"
            );


            console.log(
                "RAIN QUESTION:",
                text
            );


            console.log(
                "RAIN ENGINE:",
                rainEngine
            );


            console.log(
                "DETECTED DATA SOURCE:",
                detectedDataSource
            );


            console.log(
                "FINAL RAIN DATA SOURCE:",
                dataSource
            );


            console.log(
                "SELECTED STATION:",
                selectedMaTram
            );


            console.log(
                "RAIN CONTEXT:",
                context
            );


            // ==================================================
            // CFS
            // ==================================================

            if (
                dataSource ===
                "CFS"
            ) {

                console.log(
                    "[AIChat] Routing to CFS engine"
                );


                // ==================================================
                // 1. KIỂM TRA CÂU HỎI CÓ PHẢI CFS THEO TỈNH KHÔNG
                // ==================================================

                const cfsProvince =
                    extractCFSProvince(
                        text
                    );


                console.log(
                    "[AIChat] CFS PROVINCE:",
                    cfsProvince
                );


                // ==================================================
                // 2. CFS THEO TỈNH
                // ==================================================

                if (
                    cfsProvince
                ) {

                    console.log(
                        "[AIChat] Routing to CFS PROVINCE engine"
                    );

                    const result =
                        await summarizeCFSProvince(
                            cfsProvince
                        );

                    console.log(
                        "CFS PROVINCE QUERY RESULT:",
                        result
                    );

                    console.log(
                        "CFS PROVINCE QUERY RESULT JSON:",
                        JSON.stringify(
                            result,
                            null,
                            2
                        )
                    );

                    const answer =
                        formatCFSProvinceAnswer(
                            result
                        );

                    console.log(
                        "CFS PROVINCE ANSWER:",
                        answer
                    );

                    const assistantMessage = {
                        id:
                            generateId(),

                        role:
                            "assistant",

                        content:
                            answer,

                        dataSource:
                            "CFS",

                        cfsResult:
                            result,
                    };

                    setMessages(
                        prev => [
                            ...prev,
                            assistantMessage,
                        ]
                    );

                    logAiQuery({
                        question:
                            text,

                        answer:
                            answer,

                        messageId:
                            assistantMessage.id,

                        intent:
                            result?.intent ||
                            "CFS_PROVINCE",

                        dataSource:
                            "CFS",

                        selectedProvince:
                            cfsProvince,

                        selectedStation:
                            null,

                        mapContext:
                            mapContext,

                        result:
                            result,

                        cfsResult:
                            result,

                        success:
                            result?.success !== false,

                        errorMessage:
                            result?.success === false
                                ? result?.error ||
                                  result?.message ||
                                  null
                                : null,
                    });

                    return;
                }


                // ==================================================
                // 3. CFS THEO TRẠM
                // ==================================================

                if (
                    !selectedMaTram
                ) {

                    const answer =
                        "Bạn hãy chọn một trạm trên bản đồ " +
                        "để tôi tra cứu dự báo mưa CFS theo tháng.";


                    const assistantMessage = {

                        id:
                            generateId(),

                        role:
                            "assistant",

                        content:
                            answer,

                        dataSource:
                            "CFS",

                    };


                    setMessages(
                        prev => [

                            ...prev,

                            assistantMessage,

                        ]
                    );


                    // ------------------------------------------------
                    // LOG CFS - KHÔNG CÓ TRẠM
                    // ------------------------------------------------

                    logAiQuery({

                        question:
                            text,

                        answer:
                            answer,

                        messageId:
                            assistantMessage.id,

                        intent:
                            "CFS",

                        dataSource:
                            "CFS",

                        selectedProvince:
                            mapContext?.selectedProvince ||
                            null,

                        selectedStation:
                            mapContext?.selectedStation ||
                            null,

                        mapContext:
                            mapContext,

                        result:
                            null,

                        cfsResult:
                            null,

                        success:
                            false,

                        errorMessage:
                            "No selected station",

                    });


                    return;

                }


                // ==================================================
                // 4. QUERY CFS THEO TRẠM
                // ==================================================

                console.log(
                    "[AIChat] Routing to CFS STATION engine"
                );


                const result =
                    await queryCFSStation(
                        selectedMaTram,
                        text
                    );


                console.log(
                    "CFS QUERY RESULT:",
                    result
                );


                // ------------------------------------------------
                // FORMAT CFS ANSWER
                // ------------------------------------------------

                const answer =
                    formatCFSAnswer(
                        result
                    );


                console.log(
                    "CFS ANSWER:",
                    answer
                );


                // ------------------------------------------------
                // ASSISTANT MESSAGE
                // ------------------------------------------------

                const assistantMessage = {

                    id:
                        generateId(),

                    role:
                        "assistant",

                    content:
                        answer,

                    dataSource:
                        "CFS",

                    cfsResult:
                        result,

                };


                setMessages(
                    prev => [

                        ...prev,

                        assistantMessage,

                    ]
                );


                // ------------------------------------------------
                // LOG CFS QUERY
                // Fire-and-forget
                // ------------------------------------------------

                logAiQuery({

                    question:
                        text,

                    answer:
                        answer,

                    messageId:
                        assistantMessage.id,

                    intent:
                        result?.intent ||
                        "CFS",

                    dataSource:
                        "CFS",

                    selectedProvince:
                        mapContext?.selectedProvince ||
                        result?.province ||
                        null,

                    selectedStation:
                        mapContext?.selectedStation ||
                        selectedMaTram ||
                        null,

                    mapContext:
                        mapContext,

                    result:
                        result,

                    cfsResult:
                        result,

                    success:
                        result?.success !== false,

                    errorMessage:
                        result?.success === false
                            ? result?.error ||
                              result?.message ||
                              null
                            : null,

                });


                return;

            }


            // ==================================================
            // OBSERVED
            // ==================================================

            if (
                dataSource ===
                "OBSERVED"
            ) {

                console.log(
                    "[AIChat] Routing to OBSERVED engine"
                );


                const result =
                    await queryObserved(
                        text,
                        context
                    );


                console.log(
                    "OBSERVED QUERY RESULT:",
                    result
                );


                const answer =
                    formatObservedAnswer(
                        result
                    );


                console.log(
                    "OBSERVED ANSWER:",
                    answer
                );


                const assistantMessage = {

                    id:
                        generateId(),

                    role:
                        "assistant",

                    content:
                        answer,

                    dataSource:
                        "OBSERVED",

                    observedResult:
                        result,

                };


                setMessages(
                    prev => [

                        ...prev,

                        assistantMessage,

                    ]
                );


                // ==================================================
                // LOG OBSERVED QUERY
                // Fire-and-forget: không await
                // ==================================================

                logAiQuery({

                    question:
                        text,

                    answer:
                        answer,

                    messageId:
                        assistantMessage.id,

                    intent:
                        result?.intent || null,

                    dataSource:
                        "OBSERVED",

                    selectedProvince:
                        mapContext?.selectedProvince ||
                        result?.province ||
                        null,

                    selectedStation:
                        mapContext?.selectedStation ||
                        null,

                    mapContext:
                        mapContext,

                    result:
                        result,

                    observedResult:
                        result,

                    success:
                        result?.success !== false,

                    errorMessage:
                        result?.success === false
                            ? result?.error ||
                              result?.message ||
                              null
                            : null,

                });


                return;

            }


            // ==================================================
            // GFS / FORECAST
            // ==================================================

            console.log(
                "[AIChat] Routing to FORECAST / GFS engine"
            );


            const result =
                await queryForecast(
                    text,
                    context
                );


            console.log(
                "FORECAST QUERY RESULT:",
                result
            );


            const answer =
                formatForecastAnswer(
                    result
                );


            console.log(
                "FORECAST ANSWER:",
                answer
            );


            const assistantMessage = {

                id:
                    generateId(),

                role:
                    "assistant",

                content:
                    answer,

                dataSource:
                    result?.source ||
                    "GFS",

                forecastResult:
                    result,

            };


            setMessages(
                prev => [

                    ...prev,

                    assistantMessage,

                ]
            );


            // ==================================================
            // LOG FORECAST QUERY
            // Fire-and-forget: không await
            // ==================================================

            logAiQuery({

                question:
                    text,

                answer:
                    answer,

                messageId:
                    assistantMessage.id,

                intent:
                    result?.intent || null,

                dataSource:
                    result?.source ||
                    "GFS",

                selectedProvince:
                    mapContext?.selectedProvince ||
                    result?.province ||
                    null,

                selectedStation:
                    mapContext?.selectedStation ||
                    null,

                mapContext:
                    mapContext,

                result:
                    result,

                forecastResult:
                    result,

                success:
                    result?.success !== false,

                errorMessage:
                    result?.success === false
                        ? result?.error ||
                          result?.message ||
                          null
                        : null,

            });


        } catch (error) {

            console.error(
                "[AIChat] Rain Query Engine error:",
                error
            );


            setMessages(
                prev => [

                    ...prev,

                    {

                        id:
                            generateId(),

                        role:
                            "assistant",

                        content:
                            "Xin lỗi, tôi không thể " +
                            "lấy dữ liệu mưa lúc này. " +
                            "Vui lòng thử lại sau.",

                        dataSource:
                            "SYSTEM",

                        error:
                            true,

                    },

                ]
            );

        } finally {

            setIsLoading(false);

        }

    };


    // ========================================================
    // CLEAR CHAT
    // ========================================================

    const handleClear = () => {

        setMessages([
            INITIAL_MESSAGE
        ]);

    };


    // ========================================================
    // SUGGESTED QUESTION
    // ========================================================

    const handleSuggestedQuestion = (
        question
    ) => {

        handleSend(
            question
        );

    };


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <>

            {/* ==================================================
                FLOATING BUTTON
                ================================================== */}

            {!isOpen && (

                <button
                    type="button"
                    className="ai-chat-floating-button"
                    onClick={() =>
                        setIsOpen(true)
                    }
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


                    {/* ==================================================
                        HEADER
                        ================================================== */}

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

                                    {observedLoading
                                        ? "Đang cập nhật dữ liệu..."
                                        : "Sẵn sàng"
                                    }

                                </div>

                            </div>


                        </div>


                        {/* HEADER ACTIONS */}

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
                                onClick={() =>
                                    setIsOpen(false)
                                }
                                title="Đóng"
                            >
                                ×
                            </button>


                        </div>


                    </div>


                    {/* ==================================================
                        MAP CONTEXT
                        ================================================== */}

                    {(

                        mapContext?.selectedProvince ||

                        mapContext?.selectedStation ||

                        typeof mapContext?.lat ===
                            "number"

                    ) && (

                        <div className="ai-chat-context">


                            <div className="ai-context-label">
                                VỊ TRÍ ĐANG XEM
                            </div>


                            <div className="ai-context-value">


                                {/* ------------------------------------------
                                    PROVINCE
                                    ------------------------------------------ */}

                                {mapContext?.selectedProvince && (

                                    <span>

                                        {String(
                                            mapContext
                                                .selectedProvince
                                        )}

                                    </span>

                                )}


                                {/* ------------------------------------------
                                    STATION
                                    ------------------------------------------ */}

                                {mapContext?.selectedStation && (

                                    <span>

                                        {typeof mapContext
                                            .selectedStation ===
                                            "object"

                                            ? (

                                                <>

                                                    {
                                                        mapContext
                                                            .selectedStation
                                                            .TenTram ||

                                                        "Trạm không xác định"
                                                    }


                                                    {mapContext
                                                        .selectedStation
                                                        .MaTram &&

                                                        ` (${mapContext
                                                            .selectedStation
                                                            .MaTram})`
                                                    }

                                                </>

                                            )

                                            : String(
                                                mapContext
                                                    .selectedStation
                                            )

                                        }

                                    </span>

                                )}


                                {/* ------------------------------------------
                                    COORDINATES
                                    ------------------------------------------ */}

                                {!mapContext?.selectedProvince &&

                                    !mapContext?.selectedStation &&

                                    typeof mapContext?.lat ===
                                        "number" && (

                                        <span>

                                            {mapContext
                                                .lat
                                                .toFixed(3)}

                                            {" , "}

                                            {typeof mapContext?.lon ===
                                                "number"

                                                ? mapContext
                                                    .lon
                                                    .toFixed(3)

                                                : "?"
                                            }

                                        </span>

                                    )}


                            </div>


                        </div>

                    )}


                    {/* ==================================================
                        MESSAGES
                        ================================================== */}

                    <div className="ai-chat-messages">


                        {messages.map(
                            message => (

                                <ChatMessage
                                    key={
                                        message.id
                                    }
                                    message={
                                        message
                                    }
                                />

                            )
                        )}


                        {/* ==================================================
                            LOADING
                            ================================================== */}

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


                        {/* ==================================================
                            SUGGESTED QUESTIONS
                            ================================================== */}

                        {messages.length === 1 &&
                            !isLoading && (

                                <SuggestedQuestions
                                    onSelect={
                                        handleSuggestedQuestion
                                    }
                                />

                            )}


                        <div
                            ref={
                                messagesEndRef
                            }
                        />


                    </div>


                    {/* ==================================================
                        INPUT
                        ================================================== */}

                    <ChatInput
                        onSend={
                            handleSend
                        }
                        disabled={
                            isLoading
                        }
                    />


                </div>

            )}

        </>

    );

}