/**
 * Linkify utility to detect and convert URLs and email addresses to clickable links
 */

interface LinkifyProps {
  text: string;
}

export const Linkify = ({ text }: LinkifyProps) => {
  // Regular expressions for URL and email detection
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  
  // Split text by URLs and emails
  const parts = text.split(/(\bhttps?:\/\/[^\s]+\b|[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if it's a URL
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part}
            </a>
          );
        }
        
        // Check if it's an email
        if (emailRegex.test(part)) {
          return (
            <a
              key={index}
              href={`mailto:${part}`}
              className="text-primary hover:underline"
            >
              {part}
            </a>
          );
        }
        
        // Regular text
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

/**
 * Convert plain text with links to JSX with clickable links
 * Preserves line breaks and whitespace
 */
export const linkifyText = (text: string): JSX.Element => {
  // Split by line breaks first
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, lineIndex) => (
        <span key={lineIndex}>
          <Linkify text={line} />
          {lineIndex < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
};
