import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import "./index.css";

// Validation utility functions
const ValidationUtils = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return "Email is required";
    if (!emailRegex.test(value)) return "Please enter a valid email address";
    return null;
  },
  
  phone: (value) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = value.replace(/[\s\-\(\)\.]/g, '');
    if (!value) return "Phone number is required";
    if (cleanPhone.length < 10) return "Phone number must be at least 10 digits";
    if (!phoneRegex.test(cleanPhone)) return "Please enter a valid phone number";
    return null;
  },
  
  zipcode: (value) => {
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!value) return "Zip code is required";
    if (!zipRegex.test(value)) return "Please enter a valid zip code (12345 or 12345-6789)";
    return null;
  },
  
  name: (value) => {
    if (!value || value.trim().length === 0) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (!/^[a-zA-Z\s\-\'\.]+$/.test(value)) return "Name can only contain letters, spaces, hyphens, and apostrophes";
    return null;
  },
  
  city: (value) => {
    if (!value || value.trim().length === 0) return "City is required";
    if (value.trim().length < 2) return "City name must be at least 2 characters";
    if (!/^[a-zA-Z\s\-\'\.]+$/.test(value)) return "City name can only contain letters, spaces, hyphens, and apostrophes";
    return null;
  },
  
  date: (value) => {
    if (!value) return "Date is required";
    const selectedDate = new Date(value);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    if (selectedDate > today) return "Date cannot be in the future";
    if (selectedDate < minDate) return "Please enter a valid date";
    return null;
  },
  
  text: (value, minLength = 1, maxLength = 500) => {
    if (!value || value.trim().length === 0) return "This field is required";
    if (value.trim().length < minLength) return `Must be at least ${minLength} characters`;
    if (value.trim().length > maxLength) return `Must be less than ${maxLength} characters`;
    return null;
  },
  
  number: (value, min = null, max = null) => {
    if (!value) return "This field is required";
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return "Please enter a valid number";
    if (min !== null && numValue < min) return `Value must be at least ${min}`;
    if (max !== null && numValue > max) return `Value must be at most ${max}`;
    return null;
  }
};

const ChatApp = () => {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [userTextInput, setUserTextInput] = useState("");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [conversationPhase, setConversationPhase] = useState(null);
  const [userSelectedOption, setUserSelectedOption] = useState("");
  const [userSelectedCheckboxes, setUserSelectedCheckboxes] = useState([]);
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [shouldButtonPulse, setShouldButtonPulse] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const chatMessagesRef = useRef(null);
  const signaturePadRef = useRef();

  // Pulse animation for floating button
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (!isWidgetOpen) {
        setShouldButtonPulse(true);
        setTimeout(() => setShouldButtonPulse(false), 2000);
      }
    }, 8000);

    return () => clearInterval(pulseInterval);
  }, [isWidgetOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [conversationMessages]);

  const toggleChatWidget = () => setIsWidgetOpen(!isWidgetOpen);

  // Validation functions
  const validateInput = (value, type, fieldName) => {
    let error = null;
    
    switch (type) {
      case 'email':
        error = ValidationUtils.email(value);
        break;
      case 'phone':
        error = ValidationUtils.phone(value);
        break;
      case 'zipcode':
        error = ValidationUtils.zipcode(value);
        break;
      case 'name':
        error = ValidationUtils.name(value);
        break;
      case 'city':
        error = ValidationUtils.city(value);
        break;
      case 'date':
        error = ValidationUtils.date(value);
        break;
      case 'number':
        error = ValidationUtils.number(value);
        break;
      case 'text':
      default:
        error = ValidationUtils.text(value);
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
    
    return !error;
  };

  const validateRadioSelection = () => {
    if (!userSelectedOption) {
      setValidationErrors(prev => ({
        ...prev,
        radio: "Please select an option"
      }));
      return false;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      radio: null
    }));
    return true;
  };

  const validateCheckboxSelection = (minRequired = 1) => {
    if (userSelectedCheckboxes.length < minRequired) {
      setValidationErrors(prev => ({
        ...prev,
        checkbox: `Please select at least ${minRequired} option${minRequired > 1 ? 's' : ''}`
      }));
      return false;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      checkbox: null
    }));
    return true;
  };

  const clearValidationErrors = () => {
    setValidationErrors({});
  };

  // Simulate bot typing indicator
  const showTypingIndicator = () => {
    setIsBotTyping(true);
  };

  // API call to start new session
  const initializeSession = async (userDescription) => {
    showTypingIndicator();
    
    try {
      const response = await fetch("http://localhost:8000/load-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description: userDescription }),
      });

      const responseData = await response.json();
      setIsBotTyping(false);
      
      if (responseData?.session_id) {
        // Store session in memory instead of localStorage
        window.legalChatSessionId = responseData.session_id;
      }
      if (responseData?.current_phase) {
        setConversationPhase(responseData.current_phase);
      }

      if (responseData?.next_question) {
        setActiveQuestion(responseData.next_question);
        setConversationMessages((prevMessages) => [
          ...prevMessages,
          { role: "user", content: userDescription, avatar: "👤" },
          { role: "bot", content: responseData.next_question.question, avatar: "🤖" },
        ]);
        setIsSessionActive(true);
        
        // Handle signature type
        if (responseData.next_question.type === "signature") {
          setIsSignatureVisible(true);
        }
      }
    } catch (error) {
      setIsBotTyping(false);
      console.error("Failed to initialize session", error);
      setConversationMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: userDescription, avatar: "👤" },
        { role: "bot", content: "Sorry, I'm having trouble connecting. Please try again later.", avatar: "🤖" },
      ]);
    }
  };

  // API call to get next question
  const fetchNextQuestion = async (userAnswer = null) => {
    const sessionId = window.legalChatSessionId;
    if (!sessionId) return;

    showTypingIndicator();

    const apiEndpoint =
      conversationPhase === "clarification"
        ? "http://localhost:8000/followup-step"
        : "http://localhost:8000/next";

    const requestPayload =
      conversationPhase === "clarification"
        ? { session_id: sessionId, question: activeQuestion?.question, answer: userAnswer }
        : { session_id: sessionId, answer: userAnswer };

    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const responseData = await response.json();
      setIsBotTyping(false);

      if (responseData?.next_question) {
        setActiveQuestion(responseData.next_question);
        setConversationMessages((prevMessages) => [
          ...prevMessages,
          { role: "bot", content: responseData.next_question.question, avatar: "🤖" },
        ]);

        if (responseData?.current_phase) {
          setConversationPhase(responseData.current_phase);
        }
        
        // Handle signature type
        if (responseData.next_question.type === "signature") {
          setIsSignatureVisible(true);
        }
      } else if (responseData?.summary) {
        setConversationMessages((prevMessages) => [
          ...prevMessages,
          { role: "bot", content: responseData.summary, avatar: "🤖" },
        ]);
        setActiveQuestion(null);
      }
    } catch (error) {
      setIsBotTyping(false);
      console.error("Failed to fetch next question", error);
      setConversationMessages((prevMessages) => [
        ...prevMessages,
        { role: "bot", content: "Sorry, I encountered an error. Please try again.", avatar: "🤖" },
      ]);
    }
  };

  const handleUserSubmission = (inputValue) => {
    const messageContent = typeof inputValue === "string" ? inputValue : userTextInput;
    
    // Validation based on current question type
    if (activeQuestion) {
      let isValid = true;
      
      switch (activeQuestion.type) {
        case 'radio':
          isValid = validateRadioSelection();
          break;
        case 'checkbox':
        case 'multiselect':
          isValid = validateCheckboxSelection(activeQuestion.minRequired || 1);
          break;
        case 'email':
          isValid = validateInput(messageContent, 'email', 'input');
          break;
        case 'phone':
          isValid = validateInput(messageContent, 'phone', 'input');
          break;
        case 'zipcode':
          isValid = validateInput(messageContent, 'zipcode', 'input');
          break;
        case 'name':
          isValid = validateInput(messageContent, 'name', 'input');
          break;
        case 'city':
          isValid = validateInput(messageContent, 'city', 'input');
          break;
        case 'date':
          isValid = validateInput(messageContent, 'date', 'input');
          break;
        case 'number':
          isValid = validateInput(messageContent, 'number', 'input');
          break;
        default:
          isValid = validateInput(messageContent, 'text', 'input');
          break;
      }
      
      if (!isValid) {
        return; // Stop submission if validation fails
      }
    } else {
      // Initial message validation
      if (!validateInput(messageContent, 'text', 'input')) {
        return;
      }
    }

    if (!messageContent.trim() && !inputValue) return;

    // Clear validation errors on successful submission
    clearValidationErrors();

    if (!isSessionActive) {
      initializeSession(messageContent);
    } else {
      setConversationMessages((prevMessages) => [...prevMessages, { role: "user", content: messageContent, avatar: "👤" }]);
      fetchNextQuestion(messageContent);
    }
    setUserTextInput("");
    setUserSelectedOption("");
    setUserSelectedCheckboxes([]);
  };

  const handleCheckboxSelection = (optionValue) => {
    setUserSelectedCheckboxes((prevSelected) =>
      prevSelected.includes(optionValue) 
        ? prevSelected.filter((value) => value !== optionValue) 
        : [...prevSelected, optionValue]
    );
    
    // Clear checkbox validation error when user makes a selection
    if (validationErrors.checkbox) {
      setValidationErrors(prev => ({
        ...prev,
        checkbox: null
      }));
    }
  };

  const handleSignatureSubmission = () => {
    setConversationMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: "✅ Signature submitted", avatar: "👤" },
    ]);
    fetchNextQuestion("[Signature submitted]");
    setIsSignatureVisible(false);
  };

  const handleInputKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleUserSubmission();
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setUserTextInput(value);
    
    // Clear validation error when user starts typing
    if (validationErrors.input) {
      setValidationErrors(prev => ({
        ...prev,
        input: null
      }));
    }
  };

  const handleRadioChange = (event) => {
    setUserSelectedOption(event.target.value);
    
    // Clear radio validation error when user makes a selection
    if (validationErrors.radio) {
      setValidationErrors(prev => ({
        ...prev,
        radio: null
      }));
    }
  };

  // Digital signature canvas component
  const DigitalSignaturePad = () => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = (event) => {
      setIsDrawing(true);
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const xPosition = event.clientX - canvasRect.left;
      const yPosition = event.clientY - canvasRect.top;
      
      const canvasContext = canvas.getContext('2d');
      canvasContext.beginPath();
      canvasContext.moveTo(xPosition, yPosition);
    };

    const drawOnCanvas = (event) => {
      if (!isDrawing) return;
      
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const xPosition = event.clientX - canvasRect.left;
      const yPosition = event.clientY - canvasRect.top;
      
      const canvasContext = canvas.getContext('2d');
      canvasContext.lineTo(xPosition, yPosition);
      canvasContext.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    const clearSignature = () => {
      const canvas = canvasRef.current;
      const canvasContext = canvas.getContext('2d');
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
      <div className="signature-canvas-container">
        <canvas
          ref={canvasRef}
          width={300}
          height={120}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={drawOnCanvas}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <button
          onClick={clearSignature}
          className="signature-clear-button"
        >
          Clear
        </button>
      </div>
    );
  };

  const renderInputInterface = () => {
    if (!activeQuestion) {
      return (
        <div className="text-input-container">
          <div className="input-wrapper">
            <input
              value={userTextInput}
              onChange={handleInputChange}
              onKeyPress={handleInputKeyPress}
              placeholder="Describe what you need help with..."
              className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
            />
            {validationErrors.input && (
              <div className="validation-error">{validationErrors.input}</div>
            )}
          </div>
          <button
            onClick={handleUserSubmission}
            className="chat-send-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          </button>
        </div>
      );
    }

    switch (activeQuestion.type) {
      case "radio":
        return (
          <div className="question-options-container">
            <div className="question-options-list">
              {activeQuestion.options?.map((optionValue, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`question-option-label ${
                    userSelectedOption === optionValue ? 'question-option-label--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="question-option"
                    value={optionValue}
                    checked={userSelectedOption === optionValue}
                    onChange={handleRadioChange}
                    className="question-radio-input"
                  />
                  <span className="question-option-text">{optionValue}</span>
                </label>
              ))}
            </div>
            {validationErrors.radio && (
              <div className="validation-error">{validationErrors.radio}</div>
            )}
            <button
              className="question-submit-button"
              onClick={() => handleUserSubmission(userSelectedOption)}
            >
              Continue
            </button>
          </div>
        );

      case "checkbox":
      case "multiselect":
        return (
          <div className="question-options-container">
            <div className="question-options-list">
              {activeQuestion.options?.map((optionValue, optionIndex) => (
                <label
                  key={optionIndex}
                  className={`question-option-label ${
                    userSelectedCheckboxes.includes(optionValue) ? 'question-option-label--selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    value={optionValue}
                    checked={userSelectedCheckboxes.includes(optionValue)}
                    onChange={() => handleCheckboxSelection(optionValue)}
                    className="question-checkbox-input"
                  />
                  <span className="question-option-text">{optionValue}</span>
                </label>
              ))}
            </div>
            {validationErrors.checkbox && (
              <div className="validation-error">{validationErrors.checkbox}</div>
            )}
            <button
              className="question-submit-button"
              onClick={() => handleUserSubmission(userSelectedCheckboxes.join(", "))}
            >
              Continue ({userSelectedCheckboxes.length} selected)
            </button>
          </div>
        );

      case "signature":
        return (
          isSignatureVisible && (
            <div className="signature-input-container">
              <div className="signature-input-box">
                <p className="signature-input-label">Please sign below:</p>
                <DigitalSignaturePad />
              </div>
              <button
                className="question-submit-button"
                onClick={handleSignatureSubmission}
              >
                Submit Signature
              </button>
            </div>
          )
        );

      case "email":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter your email address..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="email"
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "phone":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter your phone number..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="tel"
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "zipcode":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter zip code (12345 or 12345-6789)..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="text"
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "name":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter your full name..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="text"
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "city":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter your city..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="text"
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "date":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Select date..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="date"
                max={new Date().toISOString().split('T')[0]}
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      case "number":
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Enter a number..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type="number"
                min={activeQuestion.min || undefined}
                max={activeQuestion.max || undefined}
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );

      default:
        return (
          <div className="text-input-container">
            <div className="input-wrapper">
              <input
                value={userTextInput}
                onChange={handleInputChange}
                onKeyPress={handleInputKeyPress}
                placeholder="Type your answer..."
                className={`chat-text-input ${validationErrors.input ? 'chat-text-input--error' : ''}`}
                type={activeQuestion?.type || "text"}
              />
              {validationErrors.input && (
                <div className="validation-error">{validationErrors.input}</div>
              )}
            </div>
            <button
              onClick={handleUserSubmission}
              className="chat-send-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="legal-intake-container">
      {/* Floating Chat Button */}
      <button
        onClick={toggleChatWidget}
        className={`floating-chat-button ${
          isWidgetOpen ? 'floating-chat-button--open' : 'floating-chat-button--closed'
        } ${shouldButtonPulse ? 'floating-chat-button--pulse' : ''}`}
      >
        {isWidgetOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Widget */}
      <div className={`legal-chat-widget ${isWidgetOpen ? 'legal-chat-widget--open' : 'legal-chat-widget--closed'}`}>
        {/* Header Section */}
        <div className="chat-widget-header">
          <div className="chat-header-content">
            <div className="chat-header-left">
              <div className="chat-header-icon">🤖</div>
              <div>
                <div className="chat-header-title">Smart Intake Bot</div>
                <div className="chat-header-subtitle">AI-powered assistance</div>
              </div>
            </div>
            <div className="chat-header-right">
             
              <div className="online-status-indicator"></div>
              <span className="online-status-text">Online</span>
               <button class="icon-btn">🎤</button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={chatMessagesRef} className="legal-chat-messages">
          {/* Welcome Message */}
          {conversationMessages.length === 0 && (
            <div className="chat-message-container">
              <div className="message-avatar message-avatar--bot">🤖</div>
              <div className="message-bubble message-bubble--bot">
                👋 Hello! I'm your Smart Intake Bot. I can help you with legal consultations, document reviews, and more. What can I assist you with today?
              </div>
            </div>
          )}

          {/* Conversation Messages */}
          {conversationMessages.map((message, messageIndex) => (
            <div
              key={messageIndex}
              className={message.role === 'user' ? 'chat-message-container--user' : 'chat-message-container'}
            >
              <div className={`message-avatar ${
                message.role === 'user' ? 'message-avatar--user' : 'message-avatar--bot'
              }`}>
                {message.avatar || (message.role === 'user' ? '👤' : '🤖')}
              </div>
              <div className={`message-bubble ${
                message.role === 'user' ? 'message-bubble--user' : 'message-bubble--bot'
              }`}>
                {message.content}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isBotTyping && (
            <div className="typing-indicator-container">
              <div className="message-avatar message-avatar--bot">🤖</div>
              <div className="typing-indicator-bubble">
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          {renderInputInterface()}
        </div>
      </div>
    </div>
  );
};

export default ChatApp;