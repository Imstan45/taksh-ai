export type ProfilingCategory =
  | "aptitude"
  | "logical_reasoning"
  | "directions"
  | "english"
  | "reading_comprehension";

export type ProfilingQuestion = {
  id: string;
  category: ProfilingCategory;
  topic: string;
  difficulty: "medium" | "hard";
  question: string;
  passage?: string;
  options: string[];
  correctOption: number;
  explanation: string;
};

export const PROFILING_QUESTIONS: ProfilingQuestion[] = [
  {
    id: "apt-01",
    category: "aptitude",
    topic: "Time and Work",
    difficulty: "hard",
    question:
      "A can finish a work in 18 days and B can finish it in 24 days. They work together for 6 days, then A leaves. How many more days will B take to finish the remaining work?",
    options: ["8 days", "10 days", "12 days", "14 days"],
    correctOption: 1,
    explanation: "Together they complete 6 × (1/18 + 1/24) = 7/12. Remaining work is 5/12. B takes (5/12) × 24 = 10 days.",
  },
  {
    id: "apt-02",
    category: "aptitude",
    topic: "Percentages",
    difficulty: "hard",
    question:
      "A number is increased by 20% and then decreased by 25%. What is the net percentage change?",
    options: ["5% increase", "5% decrease", "10% decrease", "No change"],
    correctOption: 2,
    explanation: "100 becomes 120, then 120 decreased by 25% becomes 90. Net change is 10% decrease.",
  },
  {
    id: "apt-03",
    category: "aptitude",
    topic: "Ratio and Mixtures",
    difficulty: "hard",
    question:
      "A mixture contains milk and water in the ratio 7:3. If 10 litres of water is added, the ratio becomes 7:5. What was the original quantity of the mixture?",
    options: ["30 litres", "35 litres", "40 litres", "50 litres"],
    correctOption: 3,
    explanation: "Let milk=7x and water=3x. After adding 10 litres, 7x/(3x+10)=7/5. So 5x=3x+10, x=5. Original total=10x=50 litres.",
  },
  {
    id: "apt-04",
    category: "aptitude",
    topic: "Profit and Loss",
    difficulty: "hard",
    question:
      "A shopkeeper marks an item 40% above cost price and gives a discount of 15%. What is his profit percentage?",
    options: ["17%", "19%", "21%", "25%"],
    correctOption: 1,
    explanation: "Let CP=100. MP=140. After 15% discount, SP=119. Profit=19%.",
  },
  {
    id: "lr-01",
    category: "logical_reasoning",
    topic: "Series",
    difficulty: "hard",
    question: "Find the missing number: 3, 8, 18, 38, 78, ?",
    options: ["148", "156", "158", "162"],
    correctOption: 2,
    explanation: "Each term is previous × 2 + 2: 3→8, 8→18, 18→38, 38→78, 78→158.",
  },
  {
    id: "lr-02",
    category: "logical_reasoning",
    topic: "Blood Relations",
    difficulty: "hard",
    question:
      "Pointing to a woman, Ravi says, 'Her mother's only son is my father.' How is the woman related to Ravi?",
    options: ["Mother", "Aunt", "Sister", "Grandmother"],
    correctOption: 1,
    explanation: "Her mother's only son is Ravi's father, so the woman is Ravi's father's sister: aunt.",
  },
  {
    id: "lr-03",
    category: "logical_reasoning",
    topic: "Coding-Decoding",
    difficulty: "hard",
    question: "If TABLE is coded as UCDMF, how is CHAIR coded?",
    options: ["DIBJS", "DIBIR", "DHAJS", "DIBKR"],
    correctOption: 0,
    explanation: "Each letter is shifted by +1: C→D, H→I, A→B, I→J, R→S.",
  },
  {
    id: "lr-04",
    category: "logical_reasoning",
    topic: "Syllogism",
    difficulty: "hard",
    question:
      "Statements: All engineers are learners. Some learners are leaders. Conclusion I: Some engineers are leaders. Conclusion II: Some leaders are learners. Which follows?",
    options: ["Only I", "Only II", "Both I and II", "Neither I nor II"],
    correctOption: 1,
    explanation: "Some learners are leaders means some leaders are learners. But no direct link proves some engineers are leaders.",
  },
  {
    id: "dir-01",
    category: "directions",
    topic: "Direction Sense",
    difficulty: "hard",
    question:
      "A person walks 8 km north, turns right and walks 6 km, turns right and walks 8 km, then turns left and walks 4 km. How far is he from the starting point?",
    options: ["8 km", "10 km", "12 km", "14 km"],
    correctOption: 1,
    explanation: "He returns to original north-south level. East-west movement is 6+4=10 km east.",
  },
  {
    id: "dir-02",
    category: "directions",
    topic: "Direction Sense",
    difficulty: "hard",
    question:
      "Facing east, Meena turns 135° clockwise and then 90° anticlockwise. Which direction is she facing now?",
    options: ["North-East", "South-East", "North-West", "South-West"],
    correctOption: 1,
    explanation: "East +135° is south-west? Then -90° becomes south-east. Net clockwise turn is 45°, so from east she faces south-east.",
  },
  {
    id: "dir-03",
    category: "directions",
    topic: "Shortest Path",
    difficulty: "hard",
    question:
      "A man walks 5 km west, 12 km south, 5 km east and then 4 km north. What is the shortest distance from his starting point?",
    options: ["6 km", "8 km", "10 km", "12 km"],
    correctOption: 1,
    explanation: "West and east cancel. Net movement is 8 km south.",
  },
  {
    id: "dir-04",
    category: "directions",
    topic: "Direction after Turns",
    difficulty: "hard",
    question:
      "Rahul faces north. He turns right, then 180°, then left, then 90° clockwise. Which direction is he facing?",
    options: ["North", "South", "East", "West"],
    correctOption: 3,
    explanation: "North→right=East. 180° turn=West. Left from West=South. 90° clockwise from South=West.",
  },
  {
    id: "eng-01",
    category: "english",
    topic: "Subject-Verb Agreement",
    difficulty: "hard",
    question: "Choose the grammatically correct sentence.",
    options: [
      "Neither of the answers are correct.",
      "Neither of the answers is correct.",
      "Neither answers are correct.",
      "Neither answer were correct.",
    ],
    correctOption: 1,
    explanation: "Neither is treated as singular in formal grammar, so 'is' is correct.",
  },
  {
    id: "eng-02",
    category: "english",
    topic: "Vocabulary",
    difficulty: "hard",
    question: "Choose the word closest in meaning to 'laconic'.",
    options: ["Talkative", "Brief", "Confused", "Angry"],
    correctOption: 1,
    explanation: "Laconic means using very few words; brief or concise.",
  },
  {
    id: "eng-03",
    category: "english",
    topic: "Error Correction",
    difficulty: "hard",
    question: "Identify the correct replacement: 'He is senior than me in the company.'",
    options: ["senior than I", "senior to me", "senior from me", "more senior than me only"],
    correctOption: 1,
    explanation: "The adjective 'senior' takes 'to', not 'than'.",
  },
  {
    id: "eng-04",
    category: "english",
    topic: "Sentence Completion",
    difficulty: "hard",
    question: "Choose the best word: The manager's explanation was so _____ that no one needed further clarification.",
    options: ["ambiguous", "lucid", "obscure", "redundant"],
    correctOption: 1,
    explanation: "Lucid means clear and easy to understand.",
  },
  {
    id: "rc-01",
    category: "reading_comprehension",
    topic: "Inference",
    difficulty: "hard",
    passage:
      "Many students confuse speed with mastery. A quick answer may indicate confidence, but it may also indicate guessing. Real learning becomes visible when a student can explain why an answer is correct and repeat that success under different conditions.",
    question: "What is the main idea of the passage?",
    options: [
      "Fast answers are always wrong.",
      "Confidence is more important than accuracy.",
      "Mastery requires more than speed alone.",
      "Students should avoid timed tests.",
    ],
    correctOption: 2,
    explanation: "The passage argues that speed alone does not prove mastery.",
  },
  {
    id: "rc-02",
    category: "reading_comprehension",
    topic: "Tone",
    difficulty: "hard",
    passage:
      "Automation can improve education, but it cannot replace judgment. A platform may recommend practice, but teachers and mentors still help students understand context, motivation and discipline.",
    question: "What is the author's tone?",
    options: ["Balanced", "Angry", "Dismissive", "Sarcastic"],
    correctOption: 0,
    explanation: "The author recognizes benefits of automation while also noting its limits.",
  },
  {
    id: "rc-03",
    category: "reading_comprehension",
    topic: "Assumption",
    difficulty: "hard",
    passage:
      "A placement platform becomes useful only when it converts assessment into action. Scores alone do not improve a student unless they are connected to practice, revision and feedback.",
    question: "Which assumption best supports the passage?",
    options: [
      "Students dislike scores.",
      "Assessment should guide the next learning step.",
      "Revision is unnecessary after testing.",
      "Feedback makes tests slower.",
    ],
    correctOption: 1,
    explanation: "The passage assumes that assessment is valuable when it leads to directed learning.",
  },
  {
    id: "rc-04",
    category: "reading_comprehension",
    topic: "Conclusion",
    difficulty: "hard",
    passage:
      "Two students may score the same marks but need different training. One may lose marks because of weak concepts, another because of poor time management. A good system must separate these patterns.",
    question: "What conclusion follows?",
    options: [
      "Marks alone are not enough to profile a student.",
      "All students should get the same questions.",
      "Time management is irrelevant.",
      "Conceptual weakness cannot be detected.",
    ],
    correctOption: 0,
    explanation: "The passage says equal scores can hide different weaknesses, so marks alone are insufficient.",
  },
];

export const SAFE_PROFILING_QUESTIONS = PROFILING_QUESTIONS.map(({ correctOption, explanation, ...question }) => question);
