export interface DiscoverItem {
  slug: string;
  title: string;
  type: string;
  description: string;
  overview: string;
  whyThisMatters: string;
  themes: string[];
  questions: string[];
}

export const discoverItems: DiscoverItem[] = [
  {
    slug: "inception",
    title: "Inception",
    type: "Movie",
    description: "Dream layers, memory, and the cost of closure.",
    overview:
      "Inception follows Cobb's final extraction mission, where layered dream architecture blurs strategic deception with unresolved guilt and family longing.",
    whyThisMatters:
      "Inception matters because it turns uncertainty into the core experience, forcing viewers to choose what counts as truth in a story built on manipulation.",
    themes: ["Reality vs Dreams", "Guilt", "Time", "Emotional Closure"],
    questions: [
      "What does the ending of Inception mean?",
      "Is Cobb still dreaming?",
      "Why does Cobb stop checking the top?"
    ]
  },
  {
    slug: "interstellar",
    title: "Interstellar",
    type: "Movie",
    description: "Cosmic survival framed through family and causality.",
    overview:
      "Interstellar explores humanity's extinction risk, using relativistic space travel and a closed causal loop to connect science, sacrifice, and parent-child bonds.",
    whyThisMatters:
      "Interstellar matters because it links abstract physics to emotional stakes, making its biggest scientific ideas legible through family decisions and sacrifice.",
    themes: ["Time Dilation", "Love and Duty", "Survival", "Causality"],
    questions: [
      "How does the bookshelf sequence work in Interstellar?",
      "Who created the tesseract in Interstellar?",
      "What does the ending of Interstellar imply?"
    ]
  },
  {
    slug: "dune",
    title: "Dune",
    type: "Book / Movie",
    description: "Power, prophecy, ecology, and political control.",
    overview:
      "Dune tracks Paul Atreides' rise within imperial conflict, where religion, resource economics, and long-term strategy collide on Arrakis.",
    whyThisMatters:
      "Dune matters because it frames hero narratives as political systems, showing how prophecy and control can destabilize entire civilizations.",
    themes: ["Power and Empire", "Prophecy", "Ecology", "Destiny vs Agency"],
    questions: [
      "What is the core theme of Dune?",
      "Is Paul Atreides a hero or a warning?",
      "Why is spice central to the Dune universe?"
    ]
  },
  {
    slug: "batman",
    title: "Batman",
    type: "Comic",
    description: "Justice, fear, and moral boundaries in Gotham.",
    overview:
      "Batman narratives examine vigilantism, trauma, and institutional failure through recurring conflicts between order, vengeance, and symbolic identity.",
    whyThisMatters:
      "Batman matters because it asks whether justice can exist without becoming vengeance, especially when institutions fail and symbols take over public trust.",
    themes: ["Justice vs Vengeance", "Identity", "Trauma", "Moral Limits"],
    questions: [
      "Why does Batman refuse to kill?",
      "What does Gotham represent in Batman stories?",
      "How should Joker and Batman be interpreted?"
    ]
  },
  {
    slug: "attack-on-titan",
    title: "Attack on Titan",
    type: "Anime",
    description: "Freedom, war cycles, and inherited violence.",
    overview:
      "Attack on Titan escalates from survival horror to political tragedy, focusing on intergenerational conflict, propaganda, and the ethics of retaliation.",
    whyThisMatters:
      "Attack on Titan matters because it dismantles simple hero-villain logic and exposes how fear, history, and propaganda perpetuate conflict.",
    themes: ["Freedom", "Cycle of Hatred", "Nationalism", "Sacrifice"],
    questions: [
      "What does the ending of Attack on Titan mean?",
      "Was Eren's plan inevitable?",
      "What is the central message of Attack on Titan?"
    ]
  }
];

export function getDiscoverItemBySlug(slug: string) {
  return discoverItems.find((item) => item.slug === slug);
}
