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
// INITIAL MESSAGE
// ==========================================================

const INITIAL_MESSAGE = {

    id: "welcome",

    role: "assistant",

    content:
        "Xin chào! Tôi là trợ lý AI về mưa. " +
        "Bạn có thể hỏi về mưa thực đo, " +
        "mưa dự báo GFS hoặc so sánh giữa thực đo và dự báo.",

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
            // DETECT DATA SOURCE
            // ==================================================

            const dataSource =
                detectRainDataSource(
                    text
                );


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
                "RAIN DATA SOURCE:",
                dataSource
            );


            console.log(
                "RAIN CONTEXT:",
                context
            );


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


                return;

            }


            // ==================================================
            // FORECAST
            // ==================================================

            console.log(
                "[AIChat] Routing to FORECAST engine"
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