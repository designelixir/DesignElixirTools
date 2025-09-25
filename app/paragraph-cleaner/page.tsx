"use client";

import { useState } from "react";

export default function TextCleaner() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [retainBoldItalics, setRetainBoldItalics] = useState(true);
  const [retainLineBreaks, setRetainLineBreaks] = useState(true);

  const cleanText = () => {
    let cleaned = input;

    // Always collapse double spaces to single spaces
    cleaned = cleaned.replace(/ {2,}/g, " ");

    // Handle bold/italics (assuming markdown-style **bold** and *italics*)
    if (!retainBoldItalics) {
      // Remove * and ** markers
      cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1"); // bold
      cleaned = cleaned.replace(/\*(.*?)\*/g, "$1"); // italics
      // Optional: also strip HTML <b>, <i>, <strong>, <em>
      cleaned = cleaned.replace(/<\/?(b|i|strong|em)>/gi, "");
    }

    // Handle line breaks
    if (!retainLineBreaks) {
      cleaned = cleaned.replace(/\n+/g, " "); // collapse line breaks into spaces
    }

    setOutput(cleaned);
  };

  const copyText = () => {
    if (output) {
      navigator.clipboard.writeText(output).then(() => {
        alert("Cleaned text copied to clipboard!");
      });
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h2>Text Cleaner</h2>

      <label htmlFor="inputText">Paste your text here:</label>
      <textarea
        id="inputText"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste text..."
        style={{
          width: "100%",
          height: "120px",
          margin: "10px 0",
          padding: "10px",
          fontSize: "14px",
        }}
      />

      {/* Checkboxes */}
      <div style={{ margin: "10px 0" }}>
        <label style={{ marginRight: "20px" }}>
          <input
            type="checkbox"
            checked={retainBoldItalics}
            onChange={(e) => setRetainBoldItalics(e.target.checked)}
          />{" "}
          Retain bold / italics
        </label>
        <label>
          <input
            type="checkbox"
            checked={retainLineBreaks}
            onChange={(e) => setRetainLineBreaks(e.target.checked)}
          />{" "}
          Retain line breaks
        </label>
      </div>

      <button
        onClick={cleanText}
        style={{
          margin: "5px 0",
          padding: "10px 20px",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        Clean Text
      </button>

      <label htmlFor="outputText">Cleaned text:</label>
      <textarea
        id="outputText"
        value={output}
        readOnly
        style={{
          width: "100%",
          height: "120px",
          margin: "10px 0",
          padding: "10px",
          fontSize: "14px",
        }}
      />

      <button
        onClick={copyText}
        style={{
          margin: "5px 0",
          padding: "10px 20px",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        Copy Cleaned Text
      </button>
    </div>
  );
}