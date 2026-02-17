import React from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordList(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

export function highlightQuery(text: string, query: string): JSX.Element {
  const keywords = Array.from(new Set(keywordList(query)));
  if (!text || keywords.length === 0) {
    return React.createElement(React.Fragment, null, text);
  }

  const regex = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(regex);
  const keywordSet = new Set(keywords);

  const hasAnyMatch = parts.some((part) => keywordSet.has(part.toLowerCase()));
  if (!hasAnyMatch) {
    return React.createElement(React.Fragment, null, text);
  }

  return React.createElement(
    React.Fragment,
    null,
    ...parts.map((part, index) => {
      if (keywordSet.has(part.toLowerCase())) {
        return React.createElement(
          "span",
          { key: `snippet-hit-${index}`, className: "snippet-highlight" },
          part
        );
      }
      return React.createElement(React.Fragment, { key: `snippet-text-${index}` }, part);
    })
  );
}
