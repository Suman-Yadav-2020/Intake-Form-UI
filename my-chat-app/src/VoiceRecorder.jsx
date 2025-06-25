import React, { useRef, useState } from "react";
import RecordRTC from "recordrtc";
import { Button } from "@mui/material";

const VoiceRecorder = ({ onAudioSubmit }) => {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);

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

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    recorderRef.current.stopRecording(() => {
      const blob = recorderRef.current.getBlob();
      setIsRecording(false);
      streamRef.current.getTracks().forEach((track) => track.stop());

      const audioURL = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        const base64Audio = reader.result.split(",")[1];
        onAudioSubmit(base64Audio, audioURL);
        console.log(
          "BASE64 sent to fetchFirstQuestion:",
          voiceBase64.slice(0, 100)
        );
      };
    });
  };

  return (
    <>
      {!isRecording ? (
        <Button
          variant="outlined"
          onClick={startRecording}
          sx={{ borderRadius: "30px", px: 3 }}
        >
          🎙️ Record Voice
        </Button>
      ) : (
        <Button
          variant="contained"
          color="error"
          onClick={stopRecording}
          sx={{ borderRadius: "30px", px: 3 }}
        >
          ⏹️ Stop & Submit
        </Button>
      )}
    </>
  );
};

export default VoiceRecorder;
