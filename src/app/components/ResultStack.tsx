import MediaRow from "./MediaRow";
import SourcesStrip from "../../components/results/SourcesStrip";

export interface ResultLink {
  title: string;
  url: string;
  source?: string;
  snippet?: string;
  thumbnail?: string;
  category?: "canon" | "theories" | "spoilers";
}

export interface ResultMedia {
  type: "image" | "video";
  url: string;
}

export interface ResultPayload {
  answer: string;
  links: ResultLink[];
  media: ResultMedia[];
  canon: string;
  theories: string;
  spoilers: string;
  tags: string[];
}

interface ResultStackProps {
  result: ResultPayload;
}

export default function ResultStack({ result }: ResultStackProps) {
  return (
    <div className="mt-4">
      <SourcesStrip links={result.links} />
      <MediaRow media={result.media} />
    </div>
  );
}
