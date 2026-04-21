import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Code2, Eye, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RichEmailEditorHandle {
  focus: () => void;
  getHtml: () => string;
  setHtml: (html: string) => void;
}

interface RichEmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  ghostText?: string | null;
  onAcceptGhost?: () => void;
  placeholder?: string;
  minHeight?: number;
}

export const RichEmailEditor = forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  ({ value, onChange, ghostText, onAcceptGhost, placeholder, minHeight = 220 }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<"visual" | "html">("visual");
    const [htmlSource, setHtmlSource] = useState(value);
    const isInternalUpdate = useRef(false);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      getHtml: () => editorRef.current?.innerHTML || "",
      setHtml: (html: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
          onChange(html);
        }
      },
    }));

    // Sync external value into editor (only when not from our own input)
    useEffect(() => {
      if (mode !== "visual") return;
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }, [value, mode]);

    useEffect(() => {
      setHtmlSource(value);
    }, [value, mode]);

    const handleInput = useCallback(() => {
      if (!editorRef.current) return;
      isInternalUpdate.current = true;
      onChange(editorRef.current.innerHTML);
    }, [onChange]);

    // Handle paste: preserve HTML when pasting from rich sources, including code-formatted email HTML
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const cd = e.clipboardData;
      const html = cd.getData("text/html");
      const text = cd.getData("text/plain");

      let toInsert = "";
      if (html && html.trim().length > 0) {
        toInsert = sanitizeForCompose(html);
      } else if (text) {
        // Detect if pasted text looks like raw HTML markup; if so, render it as HTML
        if (/^\s*<[a-z!][\s\S]*>/i.test(text) && /<\/?[a-z][\s\S]*>/i.test(text)) {
          toInsert = sanitizeForCompose(text);
        } else {
          toInsert = escapeHtml(text).replace(/\n/g, "<br>");
        }
      }
      if (!toInsert) return;
      document.execCommand("insertHTML", false, toInsert);
      handleInput();
    }, [handleInput]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      // Accept ghost suggestion with Tab or Right Arrow when at end
      if (ghostText && (e.key === "Tab" || (e.key === "ArrowRight" && isCaretAtEnd(editorRef.current)))) {
        e.preventDefault();
        onAcceptGhost?.();
      }
    }, [ghostText, onAcceptGhost]);

    const exec = (cmd: string, val?: string) => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      handleInput();
    };

    const insertLink = () => {
      const url = window.prompt("Enter URL");
      if (url) exec("createLink", url);
    };

    const insertImage = () => {
      const url = window.prompt("Image URL");
      if (url) exec("insertImage", url);
    };

    const switchMode = (next: "visual" | "html") => {
      if (next === mode) return;
      if (next === "html") {
        setHtmlSource(editorRef.current?.innerHTML || value);
        setMode("html");
      } else {
        // commit html source
        onChange(htmlSource);
        if (editorRef.current) editorRef.current.innerHTML = htmlSource;
        setMode("visual");
      }
    };

    return (
      <div className="rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0">
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
          <ToolbarButton onClick={() => exec("bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => exec("italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => exec("underline")} title="Underline"><Underline className="h-3.5 w-3.5" /></ToolbarButton>
          <span className="w-px h-4 bg-border mx-1" />
          <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullets"><List className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered"><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>
          <span className="w-px h-4 bg-border mx-1" />
          <ToolbarButton onClick={insertLink} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={insertImage} title="Insert image"><ImageIcon className="h-3.5 w-3.5" /></ToolbarButton>
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant={mode === "visual" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 rounded-lg text-xs gap-1"
              onClick={() => switchMode("visual")}
            >
              <Eye className="h-3.5 w-3.5" /> Visual
            </Button>
            <Button
              type="button"
              variant={mode === "html" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 rounded-lg text-xs gap-1"
              onClick={() => switchMode("html")}
            >
              <Code2 className="h-3.5 w-3.5" /> HTML
            </Button>
          </div>
        </div>

        {mode === "visual" ? (
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              data-placeholder={placeholder || "Type your message here..."}
              className={cn(
                "rich-editor w-full px-3 py-2.5 text-sm outline-none overflow-y-auto",
                "[&_a]:text-primary [&_a]:underline",
                "[&_img]:max-w-full [&_img]:h-auto",
                "[&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-muted-foreground",
                "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                "[&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:px-2 [&_th]:px-2"
              )}
              style={{ minHeight }}
            />
            {ghostText && (
              <div className="px-3 py-1.5 text-xs text-muted-foreground border-t border-dashed border-border bg-muted/20 flex items-start gap-2">
                <span className="font-semibold text-primary flex-shrink-0">Tab ↹</span>
                <span className="line-clamp-2 italic opacity-80">{ghostText}</span>
              </div>
            )}
          </div>
        ) : (
          <textarea
            value={htmlSource}
            onChange={(e) => {
              setHtmlSource(e.target.value);
              onChange(e.target.value);
            }}
            spellCheck={false}
            className="w-full px-3 py-2.5 text-xs font-mono outline-none resize-none bg-background"
            style={{ minHeight }}
            placeholder="<p>Paste or write raw HTML here...</p>"
          />
        )}
      </div>
    );
  }
);

RichEmailEditor.displayName = "RichEmailEditor";

const ToolbarButton = ({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
    className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground/70 hover:text-foreground transition-colors"
  >
    {children}
  </button>
);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip dangerous tags/attributes but preserve email design (styles, tables, fonts, colors, images)
function sanitizeForCompose(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    // remove dangerous nodes
    doc.querySelectorAll("script, iframe, object, embed, link[rel='import'], meta").forEach((n) => n.remove());
    // strip on* handlers and javascript: urls
    doc.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value;
        if (name.startsWith("on")) el.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(val)) {
          el.removeAttribute(attr.name);
        }
      });
    });
    // Prefer the body's content; if empty, fall back to whole doc
    const body = doc.body;
    return body && body.innerHTML.trim().length > 0 ? body.innerHTML : doc.documentElement.innerHTML;
  } catch {
    return html;
  }
}

function isCaretAtEnd(el: HTMLElement | null): boolean {
  if (!el) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!el.contains(range.endContainer)) return false;
  const post = range.cloneRange();
  post.selectNodeContents(el);
  post.setStart(range.endContainer, range.endOffset);
  return post.toString().trim().length === 0;
}
