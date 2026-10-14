export type JuniorsLesson = {
  slug: string;
  title: string;
  minutes: number;
  objective: string;
  explanation: string;
  example: string;
  checkpoint: string;
  answer: string;
};

export type JuniorsChapter = {
  slug: string;
  title: string;
  description: string;
  lessons: JuniorsLesson[];
};

export type JuniorsSubject = {
  slug: "mathematics" | "physics" | "chemistry";
  title: string;
  short: string;
  color: string;
  chapters: JuniorsChapter[];
};

const representative = (slug: string, title: string, objective: string, explanation: string, example: string, checkpoint: string, answer: string): JuniorsLesson => ({
  slug, title, minutes: 12, objective, explanation, example, checkpoint, answer,
});

export const juniorsCurriculum: JuniorsSubject[] = [
  {
    slug: "mathematics", title: "Mathematics", short: "M", color: "#0f8b6d",
    chapters: [
      { slug: "algebra", title: "Algebra", description: "Equations, sequences and the structures behind them.", lessons: [representative("quadratic-roots", "Reading quadratic roots", "Connect the discriminant to the nature of a quadratic's roots.", "For ax² + bx + c = 0, the discriminant D = b² − 4ac tells us whether real roots exist. D > 0 gives two distinct real roots, D = 0 gives one repeated real root, and D < 0 gives a complex-conjugate pair.", "For 2x² − 5x + 2 = 0, D = 25 − 16 = 9. The two real roots are (5 ± 3)/4, so x = 2 or x = 1/2.", "How many real roots does x² + 4x + 5 = 0 have?", "D = 16 − 20 = −4, so it has no real roots (and two complex roots).")], },
      { slug: "trigonometry", title: "Trigonometry", description: "Angles, identities and periodic functions.", lessons: [] },
      { slug: "coordinate-geometry", title: "Coordinate Geometry", description: "Lines, circles and conic sections.", lessons: [] },
      { slug: "calculus", title: "Calculus", description: "Limits, differentiation and integration.", lessons: [] },
      { slug: "vectors", title: "Vectors", description: "Magnitude, direction and spatial reasoning.", lessons: [] },
      { slug: "probability", title: "Probability", description: "Events, counting and uncertainty.", lessons: [] },
      { slug: "statistics", title: "Statistics", description: "Distributions and measures of data.", lessons: [] },
    ],
  },
  {
    slug: "physics", title: "Physics", short: "P", color: "#2563eb",
    chapters: [
      { slug: "mechanics", title: "Mechanics", description: "Motion, forces, energy and momentum.", lessons: [representative("newtons-second-law", "Force changes motion", "Apply Newton's second law to one-dimensional motion.", "Newton's second law relates net force to acceleration: Fnet = ma. Always combine forces with their directions before using the equation; a force is not the same thing as a net force.", "A 2 kg block has 10 N to the right and 4 N to the left. Fnet = 6 N right, so a = 6/2 = 3 m/s² right.", "A 5 kg cart experiences a net force of 15 N. What is its acceleration?", "a = Fnet/m = 15/5 = 3 m/s² in the direction of the net force.")], },
      { slug: "thermodynamics", title: "Thermodynamics", description: "Heat, work and energy transfer.", lessons: [] },
      { slug: "waves", title: "Waves", description: "Oscillations, sound and wave behaviour.", lessons: [] },
      { slug: "electricity", title: "Electricity", description: "Charge, fields, potential and circuits.", lessons: [] },
      { slug: "magnetism", title: "Magnetism", description: "Magnetic fields and electromagnetic effects.", lessons: [] },
      { slug: "optics", title: "Optics", description: "Reflection, refraction and optical systems.", lessons: [] },
      { slug: "modern-physics", title: "Modern Physics", description: "Atoms, nuclei and quantum ideas.", lessons: [] },
    ],
  },
  {
    slug: "chemistry", title: "Chemistry", short: "C", color: "#7c3aed",
    chapters: [
      { slug: "physical-chemistry", title: "Physical Chemistry", description: "Quantities, energetics and equilibrium.", lessons: [representative("mole-concept", "The mole as a counting unit", "Convert between amount of substance and number of particles.", "One mole contains Avogadro's constant, 6.022 × 10²³ representative particles. Use N = nNA, where N is particle count, n is amount in moles and NA is Avogadro's constant.", "For 0.50 mol of oxygen molecules, N = 0.50 × 6.022 × 10²³ = 3.011 × 10²³ molecules.", "How many molecules are in 2.0 mol of water?", "N = 2.0 × 6.022 × 10²³ = 1.2044 × 10²⁴ water molecules.")], },
      { slug: "inorganic-chemistry", title: "Inorganic Chemistry", description: "Periodic trends, bonding and compounds.", lessons: [] },
      { slug: "organic-chemistry", title: "Organic Chemistry", description: "Carbon compounds, mechanisms and reactions.", lessons: [] },
    ],
  },
];

export function findJuniorsChapter(subjectSlug: string, chapterSlug: string) {
  const subject = juniorsCurriculum.find((item) => item.slug === subjectSlug);
  const chapter = subject?.chapters.find((item) => item.slug === chapterSlug);
  return subject && chapter ? { subject, chapter } : null;
}

export const publishedJuniorsLessons = juniorsCurriculum.flatMap(subject => subject.chapters.flatMap(chapter => chapter.lessons.map(lesson => ({ subject, chapter, lesson }))));
