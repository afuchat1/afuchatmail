import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";

interface EmailBodyFrameProps {
  html?: string;
  text?: string;
}

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "textarea", "select", "button", "meta", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onchange", "onsubmit"],
    ALLOW_DATA_ATTR: false,
    WHOLE_DOCUMENT: false,
  });

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const linkifyPlain = (text: string) => {
  const escaped = escapeHtml(text);
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );
};

const buildSrcDoc = (bodyHtml: string) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: #1f2328;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
  body { padding: 4px 2px; }
  img { max-width: 100%; height: auto; }
  a { color: #1a73e8; }
  table { border-collapse: collapse; max-width: 100%; }
  blockquote {
    margin: 0;
    padding-left: 12px;
    border-left: 3px solid #d0d7de;
    color: #57606a;
  }
  pre, code { white-space: pre-wrap; word-break: break-word; }
</style>
</head>
<body>
${bodyHtml}
<script>
(function () {
  function postHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    parent.postMessage({ type: "email-frame-height", height: h }, "*");
  }
  window.addEventListener("load", postHeight);
  setTimeout(postHeight, 100);
  setTimeout(postHeight, 500);
  setTimeout(postHeight, 1500);
  if (window.ResizeObserver) {
    new ResizeObserver(postHeight).observe(document.body);
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    while (t && t.tagName !== "A") t = t.parentNode;
    if (t && t.href) {
      e.preventDefault();
      window.open(t.href, "_blank", "noopener,noreferrer");
    }
  });
})();
</script>
</body>
</html>`;

export const EmailBodyFrame = ({ html, text }: EmailBodyFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(120);

  const inner = html?.trim()
    ? sanitize(html)
    : `<div style="white-space: pre-wrap; font-family: inherit;">${linkifyPlain(text || "")}</div>`;

  const srcDoc = buildSrcDoc(inner);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === "email-frame-height" &&
        typeof event.data.height === "number"
      ) {
        setHeight(Math.max(60, Math.ceil(event.data.height) + 8));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      scrolling="no"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
      srcDoc={srcDoc}
      style={{
        width: "100%",
        height,
        border: 0,
        display: "block",
        background: "transparent",
        overflow: "hidden",
      }}
    />
  );
};
