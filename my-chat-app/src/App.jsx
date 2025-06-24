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
import "./App.css"; // 👈 Your reference CSS

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


  const fetchFirstQuestion = async (userInitInput) => {
    try {
      const res = await fetch("http://localhost:8000/load-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: userInitInput }),
      });

      const data = await res.json();
      if (data?.session_id) {
        localStorage.setItem("chat_session_id", data.session_id);
      }
      if (data?.current_phase) setCurrentPhase(data.current_phase);
      if (data?.next_question) {
        setCurrentQuestion(data.next_question);
        setMessages((prev) => [
          ...prev,
          { role: "user", content: userInitInput },
          { role: "bot", content: data.next_question.question },
        ]);
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
        setMessages((prev) => [...prev, { role: "bot", content: data.summary }]);
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
      fetchFirstQuestion(inputValue);
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
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    );
  };

  const renderInputArea = () => {
    switch (currentQuestion?.type) {
      case "checkbox":
      case "multiselect":
        return (
          <>
          <Snackbar
  open={showError}
  autoHideDuration={4000}
  onClose={() => setShowError(false)}
  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <Alert severity="error" onClose={() => setShowError(false)} sx={{ width: "100%" }}>
    {errorMessage}
  </Alert>
</Snackbar>

            <FormGroup>
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
            </FormGroup>
            <Button
              variant="contained"
              onClick={() => handleSend(selectedCheckboxes.join(", "))}
              disabled={selectedCheckboxes.length === 0}
              className="send-btn"
            >
              Submit
            </Button>
          </>
        );
      case "signature":
        return (
          showSignature && (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ width: 500, height: 200, className: "sigCanvas" }}
                backgroundColor="#fff"
                style={{ border: "1px solid #ccc", borderRadius: "10px" }}
              />
              <Button variant="contained" onClick={handleSignatureSubmit} className="send-btn" sx={{ mt: 2 }}>
                Submit Signature
              </Button>
            </Box>
          )
        );
      case "radio":
        return (
          <>
            <RadioGroup value={selectedOption} onChange={(e) => setSelectedOption(e.target.value)}>
              {currentQuestion.options?.map((opt, idx) => (
                <FormControlLabel key={idx} value={opt} control={<Radio />} label={opt} />
              ))}
            </RadioGroup>
            <Button
              variant="contained"
              onClick={() => handleSend(selectedOption)}
              disabled={!selectedOption}
              className="send-btn"
            >
              Submit
            </Button>
          </>
        );
      default:
        return (
          <>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type your answer..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="input-message"
            />
            <button className="send-btn" onClick={handleSend}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </>
        );
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-container active">
      <div className="chat-header">
        <div className="logo-section">
          <div className="logo">A</div>
          <div className="app-name">Attmosfire Chatbot</div>
        </div>
        <div className="header-icons">
          <IconButton className="icon-btn">📎</IconButton>
          <IconButton className="icon-btn">🎤</IconButton>
        </div>
      </div>

      <div className="chat-content" ref={contentRef}>
        <input className="input-field" placeholder="Do you have question?" readOnly />
        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message ${msg.role === "bot" ? "support" : "user"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className={`avatar ${msg.role === "bot" ? "support-avatar" : ""}`}>
              {msg.role === "bot" ? "🤖" : "👤"}
            </div>
            <div className="message-bubble">{msg.content}</div>
          </motion.div>
        ))}
      </div>

      <div className="chat-input">{renderInputArea()}</div>
    </div>
  );
};

export default ChatApp;
