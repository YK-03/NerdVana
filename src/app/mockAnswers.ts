export interface AnswerPoint {
  text: string;
  source?: string;
}

export interface Source {
  title: string;
  url: string;
  type: string;
  text?: string;
}

export type AnswerPointInput = string | AnswerPoint;

export interface AnswerCategory {
  id: string;
  title: string;
  description: string;
  points: AnswerPointInput[];
  sources?: Source[];
}

export interface MockAnswer {
  summary: string;
  categories: AnswerCategory[];
  spoilers: string;
  canon?: string;
  theories?: string;
  links?: {
    title: string;
    url: string;
    source?: string;
    snippet?: string;
  }[];
}

export type MockAnswersByContext = Record<string, Record<string, MockAnswer>>;

export const mockAnswers: MockAnswersByContext = {
  default: {
    "inception ending": {
      summary:
        "The ending is intentionally ambiguous and prioritizes Cobb's emotional closure over a literal reality verdict.",
      categories: [
        {
          id: "canon_evidence",
          title: "CANON EVIDENCE",
          description: "What the film explicitly shows or confirms.",
          points: [
            "The spinning top keeps wobbling before the scene cuts.",
            "Cobb no longer checks the totem and moves toward his children."
          ]
        },
        {
          id: "creator_intent",
          title: "CREATOR INTENT",
          description: "Statements or signals from the creator.",
          points: [
            "Nolan has emphasized the ending's emotional meaning over technical certainty.",
            "The final cut preserves ambiguity as a deliberate narrative choice."
          ]
        },
        {
          id: "fan_theories",
          title: "FAN THEORIES",
          description: "Common interpretations discussed by fans.",
          points: [
            "One reading says the wobble hints the top would eventually fall.",
            "Another says ambiguity itself is the point, regardless of dream-vs-reality."
          ]
        }
      ],
      spoilers:
        "Cobb reaches his children after one final mission, but the film withholds hard proof about the dream state."
    },
    "interstellar bookshelf": {
      summary:
        "The bookshelf sequence presents a five-dimensional construct where Cooper transmits data to Murph through gravity.",
      categories: [
        {
          id: "canon_evidence",
          title: "CANON EVIDENCE",
          description: "What the film explicitly shows or confirms.",
          points: [
            "Inside the tesseract, Cooper can access many moments of Murph's room.",
            "He uses gravity to send coordinates and quantum data through the watch."
          ]
        },
        {
          id: "creator_intent",
          title: "CREATOR INTENT",
          description: "Signals from the film's construction and thematic framing.",
          points: [
            "The scene is built as a causal loop that links Cooper's actions to humanity's survival.",
            "The film treats love and persistence as decision-making anchors within hard-science stakes."
          ]
        },
        {
          id: "fan_theories",
          title: "FAN THEORIES",
          description: "Common interpretations discussed by fans.",
          points: [
            "Some viewers read the tesseract as proof of deterministic time.",
            "Others view it as a metaphorical bridge between emotion and physics."
          ]
        }
      ],
      spoilers:
        "Cooper is the 'ghost' Murph experienced, and his gravitational messages unlock the equation needed to save Earth."
    }
  },
  inception: {
    "what is the ending": {
      summary:
        "Inception's ending intentionally keeps dream-vs-reality unresolved, while making Cobb's emotional choice the real payoff.",
      categories: [
        {
          id: "contextual_canon",
          title: "INCEPTION CANON",
          description: "Evidence specific to Inception's ending mechanics.",
          points: [
            "The top is still spinning at cut, but it visibly wobbles.",
            "Cobb walks away from the totem and chooses family over certainty."
          ]
        },
        {
          id: "totem_logic",
          title: "TOTEM LOGIC",
          description: "How the film uses the totem as a framing tool.",
          points: [
            "Totems are personal verification tools, not absolute truth for viewers.",
            "The film withholds a definitive result to preserve the central ambiguity."
          ]
        },
        {
          id: "debate_surface",
          title: "DEBATE SURFACE",
          description: "Where fan interpretations usually diverge.",
          points: [
            "Some read the wobble as a likely fall, implying reality.",
            "Others argue the unresolved cut is the point, not a puzzle to close."
          ]
        }
      ],
      spoilers:
        "Cobb finally sees his children, and the top is left spinning as the shot cuts before confirmation."
    }
  },
  interstellar: {
    "what is the bookshelf": {
      summary:
        "The bookshelf is a five-dimensional communication interface where Cooper relays data across time using gravity.",
      categories: [
        {
          id: "contextual_canon",
          title: "INTERSTELLAR CANON",
          description: "Direct events from Interstellar's tesseract sequence.",
          points: [
            "Cooper reaches Murph's room across multiple moments in time.",
            "He encodes key information through gravitational interactions."
          ]
        },
        {
          id: "time_structure",
          title: "TIME STRUCTURE",
          description: "How causal loop logic is presented in the film.",
          points: [
            "The 'ghost' signals are revealed to be Cooper's own actions.",
            "The sequence is a stable loop linking past and future outcomes."
          ]
        },
        {
          id: "debate_surface",
          title: "DEBATE SURFACE",
          description: "Common interpretation splits among fans.",
          points: [
            "One view treats the construct as hard sci-fi extrapolation.",
            "Another reads it as thematic shorthand for love across dimensions."
          ]
        }
      ],
      spoilers:
        "Cooper sends Murph the data she needs via the watch, completing the loop that saves humanity."
    }
  }
};
