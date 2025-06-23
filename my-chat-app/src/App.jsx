import React, { useState, useRef } from "react";
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
} from "@mui/material";
import { motion } from "framer-motion";
import SignatureCanvas from "react-signature-canvas";

const ChatApp = () => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSignature, setShowSignature] = useState(true);
  const [selectedOption, setSelectedOption] = useState("");
  const [selectedCheckboxes, setSelectedCheckboxes] = useState([]);
  const sigCanvas = useRef();
  const [currentPhase, setCurrentPhase] = useState(null);

  const fetchFirstQuestion = async (userInitInput) => {
    try {
      const res = await fetch("http://localhost:8000/load-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: userInitInput }),
      });

      const data = await res.json();
      if (data?.session_id) {
        localStorage.setItem("chat_session_id", data.session_id);
      }
      if (data?.current_phase) {
        setCurrentPhase(data.current_phase); // 👈 Save phase
      }

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

      if (data?.next_question) {
        setCurrentQuestion(data.next_question);
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.next_question.question },
        ]);

        if (data?.current_phase) {
          setCurrentPhase(data.current_phase); // 👈 keep tracking new phase
        }
      } else if (data?.summary) {
        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.summary },
        ]);
      }
    } catch (error) {
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
  };

  const handleSignatureSubmit = () => {
    if (sigCanvas.current) {
      // const dataUrl = sigCanvas.current
      //   .getTrimmedCanvas()
      //   .toDataURL("image/png");
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
              sx={{
                borderRadius: "30px",
                px: 4,
                py: 1.5,
                textTransform: "none",
              }}
            >
              Submit
            </Button>
          </Box>
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
                color="primary"
                sx={{
                  mt: 2,
                  borderRadius: "30px",
                  px: 4,
                  py: 1.5,
                  textTransform: "none",
                }}
                onClick={handleSignatureSubmit}
              >
                Submit Signature
              </Button>
            </Box>
          )
        );
      case "radio":
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <RadioGroup
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {currentQuestion.options?.map((opt, idx) => (
                <FormControlLabel
                  key={idx}
                  value={opt}
                  control={<Radio />}
                  label={opt}
                />
              ))}
            </RadioGroup>
            <Button
              variant="contained"
              onClick={() => handleSend(selectedOption)}
              disabled={!selectedOption}
              sx={{
                borderRadius: "30px",
                px: 4,
                py: 1.5,
                textTransform: "none",
              }}
            >
              Submit
            </Button>
          </Box>
        );
      default:
        return (
          <>
            <TextField
              fullWidth
              type={currentQuestion?.type || "text"}
              label="Your answer"
              variant="outlined"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "30px",
                  backgroundColor: "#f5f5f5",
                  px: 2,
                  py: 1,
                  "& fieldset": {
                    borderColor: "#ccc",
                  },
                  "&:hover fieldset": {
                    borderColor: "#999",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                  },
                },
              }}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              sx={{
                borderRadius: "30px",
                px: 3,
                py: 1.5,
                textTransform: "none",
              }}
            >
              Send
            </Button>
          </>
        );
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Typography
        variant="h4"
        align="center"
        sx={{ py: 2, backgroundColor: "#1976d2", color: "white" }}
      >
        Smart Intake Chatbot
      </Typography>

      <Box
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          px: 3,
          py: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              alignSelf: msg.role === "bot" ? "flex-start" : "flex-end",
              maxWidth: "75%",
              backgroundColor: msg.role === "bot" ? "#e1f5fe" : "#1976d2",
              color: msg.role === "bot" ? "#000" : "#fff",
              padding: "12px 16px",
              borderRadius:
                msg.role === "bot" ? "16px 16px 16px 0" : "16px 16px 0 16px",
              marginBottom: "10px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {msg.content}
          </motion.div>
        ))}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          p: 2,
          borderTop: "1px solid #ccc",
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderInputArea()}
      </Box>
    </Box>
  );
};

export default ChatApp;
