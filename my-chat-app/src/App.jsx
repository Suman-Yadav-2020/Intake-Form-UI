import React, { useState, useRef, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  IconButton,
} from "@mui/material";
import { motion } from "framer-motion";
import SignatureCanvas from "react-signature-canvas";
import { Snackbar, Alert } from "@mui/material";
import "./App.css"; 
import VoiceRecorder from "./VoiceRecorder";
import RecordRTC from "recordrtc";


const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSignature, setShowSignature] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);
  const sigCanvas = useRef();
  const contentRef = useRef();
  const [currentPhase, setCurrentPhase] = useState(null);

const [showError, setShowError] = useState(false);
const [errorMessage, setErrorMessage] = useState("");
 const [showRecorder, setShowRecorder] = useState(false);


  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      recorderRef.current = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        desiredSampRate: 16000,
      });

      recorderRef.current.startRecording();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      streamRef.current.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      const audioURL = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Audio = reader.result.split(",")[1];

        setMessages((prev) => [
          ...prev,
          { role: "user", type: "audio", audioUrl: audioURL },
        ]);

        fetchFirstQuestion(null, base64Audio);
      };
    });
  };

  const fetchFirstQuestion = async (
    userInitInput = null,
    voiceAnswer = null
  ) => {
    try {
      const res = await fetch("http://localhost:8000/load-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: userInitInput,
          voice_description: voiceAnswer,
        }),
      });

      const data = await res.json();
      if (data?.session_id) {
        localStorage.setItem("chat_session_id", data.session_id);
      }
      if (data?.current_phase) setCurrentPhase(data.current_phase);
      if (data?.next_question) {
        // If user typed input
        if (userInitInput) {
          setMessages((prev) => [
            ...prev,
            { role: "user", content: userInitInput },
            { role: "bot", content: data.next_question.question },
          ]);
        } else {
          // Voice message was already added earlier, only add bot response
          setMessages((prev) => [
            ...prev,
            { role: "bot", content: data.next_question.question },
          ]);
        }

        setCurrentQuestion(data.next_question);
        setSessionStarted(true);
      }
    } catch (error) {
      console.error("Failed to start session", error);
    }
  };

  const fetchNextQuestion = async (answer = null) => {
    const sessionId = localStorage.getItem("chat_session_id");
    if (!sessionId) return;

    const url =
      currentPhase === "clarification"
        ? "http://localhost:8000/followup-step"
        : "http://localhost:8000/next";

    const payload =
      currentPhase === "clarification"
        ? { session_id: sessionId, question: currentQuestion?.question, answer }
        : { session_id: sessionId, answer };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

if (data?.error) {
  // alert(data.error);
  setErrorMessage(data.error);
  setShowError(true);
}


      if (data?.next_question) {
        setCurrentQuestion(data.next_question);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.next_question.question },
        ]);
        if (data?.current_phase) setCurrentPhase(data.current_phase);
      } else if (data?.summary) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.summary },
        ]);
      }
    } catch (error) {
      //  console.log(data);
      console.error("Failed to fetch question", error);
    }
  };

  const handleSend = (value) => {
    const inputValue = typeof value === "string" ? value : userInput;
    if (!inputValue.trim()) return;

    if (!sessionStarted) {
      fetchFirstQuestion(inputValue, null);
    } else {
      setMessages((prev) => [...prev, { role: "user", content: inputValue }]);
      fetchNextQuestion(inputValue);
    }
    setUserInput("");
    setSelectedOption("");
    setSelectedCheckboxes([]);
  };

  const handleSignatureSubmit = () => {
    if (sigCanvas.current) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "[Signature submitted]" },
      ]);
      fetchNextQuestion("[Signature submitted]");
      sigCanvas.current.clear();
      setShowSignature(false);
    }
  };

  const handleCheckboxChange = (option) => {
    setSelectedCheckboxes((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const renderInputArea = () => {
    switch (currentQuestion?.type) {
      case "checkbox":
      case "multiselect":
        return (
          <>
            <FormGroup className="flex">
              <Box>
              {currentQuestion.options?.map((opt, idx) => (
                <FormControlLabel 
                  key={idx}
                  control={
                    <Checkbox
                      checked={selectedCheckboxes.includes(opt)}
                      onChange={() => handleCheckboxChange(opt)}
                    />
                  }
                  label={opt}
                />
              ))}
              </Box>
            </FormGroup>

 <Box>
            <button
              type="submit"
              onClick={() => handleSend(selectedCheckboxes.join(", "))}
              disabled={selectedCheckboxes.length === 0}
            className="chat-send-button floating-chat-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
            </button>
            </Box>
          </>
        );
      case "signature":
        return (
          showSignature && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: "sigCanvas",
                }}
                backgroundColor="#fff"
                style={{ border: "1px solid #ccc", borderRadius: "10px" }}
              />
              <Button
                variant="contained"
                onClick={handleSignatureSubmit}
                className="send-btn"
                sx={{ mt: 2 }}
              >
                Submit Signature
              </Button>
            </Box>
          )
        );
      case "radio":
        return (
          <>
            <RadioGroup
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            ><Box>
              {currentQuestion.options?.map((opt, idx) => (
                <FormControlLabel className="custon-radio"
                  key={idx}
                  value={opt}
                  control={<Radio />}
                  label={opt}
                />
              ))}
              </Box>
            </RadioGroup>

             <button
              type="submit"
                onClick={() => handleSend(selectedOption)}
              disabled={!selectedOption}
            className="chat-send-button floating-chat-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
            </button>
          </>
        );
      default:
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <TextField
        fullWidth
        placeholder="Type your answer..."
        variant="outlined"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        className="input-message"
        InputProps={{
          endAdornment: (
            <> {!sessionStarted && (
              <IconButton onClick={isRecording ? stopRecording : startRecording}>
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="#f44336">
                    <path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.1q-2.875-.35-4.938-2.5Q4 13.25 4 10h2q0 2.5 1.75 4.25T12 16q2.5 0 4.25-1.75T18 10h2q0 3.25-2.063 5.4Q15.875 17.55 13 17.9V21Z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="#8b5cf6">
                    <path d="M12 14q-1.25 0-2.125-.875T9 11V5q0-1.25.875-2.125T12 2q1.25 0 2.125.875T15 5v6q0 1.25-.875 2.125T12 14Zm-1 7v-3.1q-2.875-.35-4.938-2.5Q4 13.25 4 10h2q0 2.5 1.75 4.25T12 16q2.5 0 4.25-1.75T18 10h2q0 3.25-2.063 5.4Q15.875 17.55 13 17.9V21Z"/>
                  </svg>
                )}
              </IconButton>
            )}
              <IconButton onClick={handleSend} className="chat-send-button" >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
                </svg>
              </IconButton>
            </>
          ),
        }}
      />
    </Box>
        );
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <>
              <Snackbar className="toster-message"
  open={showError}
  autoHideDuration={400000000}
  onClose={() => setShowError(false)}
  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <Alert severity="error" onClose={() => setShowError(false)} sx={{ width: "100%" }}>
    {errorMessage}
  </Alert>
</Snackbar>
   
    <div className="chat-container active">
      <div className="chat-header">
        <div className="logo-section">
          <div className="logo">AI</div>
          <div className="app-name">BTC Chatbot</div>
        </div>
        <div className="header-icons">
  
        </div>
      </div>

      <div className="chat-content" ref={contentRef}>

        {/* <input className="input-field" placeholder="Welcome to Attmosfire!" readOnly /> */}
        <div className="chat-message-container">
              <div className="message-avatar message-avatar--bot">🤖</div>
              <div className="message-bubble message-bubble--bot">
                👋 Hello! I'm your Smart Intake Bot. I can help you, What can I assist you with today?
              </div>
            </div>

        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message ${msg.role === "bot" ? "support" : "user"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div
              className={`avatar ${msg.role === "bot" ? "support-avatar" : ""}`}
            >
              {msg.role === "bot" ? "🤖" : "👤"}
            </div>
            <div className="message-bubble">
              {msg.type === "audio" ? (
                <audio controls src={msg.audioUrl} />
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="chat-input">{renderInputArea()}</div>
      {/* {showRecorder && (
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <VoiceRecorder
            onAudioSubmit={(base64, audioURL) => {
              setMessages((prev) => [
                ...prev,
                { role: "user", type: "audio", audioUrl: audioURL },
              ]);

              fetchFirstQuestion(null, base64);
              setShowRecorder(false);
            }}
          />
        </div>
      )} */}
    </div>
     </>
  );
};

export default ChatApp;
