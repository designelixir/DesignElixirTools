"use client";

import { useRef, useState } from "react";

export default function RichTextCleaner() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState("");
  const [copyStatus, setCopyStatus] = useState(false);

  const cleanHtml = () => {
    if (!editorRef.current) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(editorRef.current.innerHTML, "text/html");

    // 1. Remove <div> wrappers
    doc.querySelectorAll("div").forEach((div) => {
      const parent = div.parentNode;
      while (div.firstChild) {
        parent?.insertBefore(div.firstChild, div);
      }
      parent?.removeChild(div);
    });

    // 2. Remove empty paragraphs
    doc.querySelectorAll("p").forEach((p) => {
      if (!p.textContent || p.textContent.trim() === "" || p.innerHTML.match(/^(&nbsp;|\s)*$/)) {
        p.remove();
      }
    });

    // 3. Handle <p><strong>Heading</strong><br> case
    doc.querySelectorAll("p").forEach((p) => {
      const html = p.innerHTML.trim();
      if (html.match(/^<strong>.*<\/strong><br>/i)) {
        const container = document.createElement("div");

        // Extract heading
        const headingHtml = html.replace(/<br>[\s\S]*/i, "");
        const paraHtml = html.replace(/^<strong>.*<\/strong><br>/i, "").trim();

        if (headingHtml) {
          const newHeadingP = document.createElement("p");
          newHeadingP.innerHTML = headingHtml;
          container.appendChild(newHeadingP);
        }

        if (paraHtml) {
          const newParaP = document.createElement("p");
          newParaP.innerHTML = paraHtml;
          container.appendChild(newParaP);
        }

        p.replaceWith(...container.childNodes);
      }
    });

    let html = doc.body.innerHTML;

    // 4. Replace &nbsp; with spaces
    html = html.replace(/&nbsp;/g, " ");

    // 5. Normalize spaces
    html = html.replace(/\s+/g, " "); // collapse multiple spaces
    html = html.replace(/>\s+</g, "><"); // no spaces between tags
    html = html.replace(/<p>\s+/g, "<p>"); // trim leading spaces in <p>
    html = html.replace(/\s+<\/p>/g, "</p>"); // trim trailing spaces in </p>

    setOutput(html.trim());
  };

  const clearText = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setOutput("");
  };

const copyToClipboard = () => {
  if (output) {
    const blob = new Blob([output], { type: "text/html" });
    const data = [new ClipboardItem({ "text/html": blob, "text/plain": new Blob([output], { type: "text/plain" }) })];

    navigator.clipboard.write(data).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000); // revert after 2s
    });
  }
};

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <div className="flex-center-spacebetween">
        <h2>Rich Text Cleaner</h2>
        <div className="flex-center-end">
          <button onClick={clearText}>Clear Text</button>
        </div>
      </div>

      <div className="flex-start-start">
        <div
          className="flex-start-start flex-column"
          style={{ maxWidth: "45vw", marginRight: "2.5vw" }}
        >
          <div className="flex-center-spacebetween full-width">
            <p>
              <strong>Copy text here</strong>
            </p>
            <button onClick={cleanHtml}>Clean Rich Text</button>
          </div>

          <div className="rich-text-box" ref={editorRef} contentEditable></div>
        </div>

        {output && (
          <div>
            <div className="flex-center-spacebetween full-width">
              <p>
                <strong>Cleaned Text</strong>
              </p>
              <button
                onClick={copyToClipboard}
                style={{
                  backgroundColor: copyStatus ? "green" : "",
                  color: copyStatus ? "white" : "",
                }}
              >
                {copyStatus ? "Text copied to clipboard" : "Copy Cleaned Text"}
              </button>
            </div>
            <div
              className="rich-text-box"
              dangerouslySetInnerHTML={{ __html: output }}
            />
          </div>
        )}
      </div>
    </div>
  );
}