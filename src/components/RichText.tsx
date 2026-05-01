import { Link } from "react-router-dom";

export default function RichText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        // Hashtag regex: matches # followed by letters, numbers, or underscores
        // Support Unicode for Arabic and other languages
        if (/^#[\p{L}\p{N}_]+/u.test(part)) {
          const match = part.match(/^#([\p{L}\p{N}_]+)(.*)/u);
          if (match) {
            const tag = match[1].toLowerCase();
            const rest = match[2];
            return (
              <span key={i}>
                <Link to={`/tag/${encodeURIComponent(tag)}`} className="text-primary hover:underline">
                  #{match[1]}
                </Link>
                {rest}
              </span>
            );
          }
        }
        // Mention regex: matches @ followed by a-z, 0-9, or underscore
        if (/^@[a-z0-9_]+/i.test(part)) {
          const match = part.match(/^@([a-z0-9_]+)(.*)/i);
          if (match) {
            const username = match[1];
            const rest = match[2];
            return (
              <span key={i}>
                <Link to={`/u/${username}`} className="text-primary hover:underline">
                  @{username}
                </Link>
                {rest}
              </span>
            );
          }
        }
        if (/^https?:\/\/\S+/.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline break-all">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
