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
      { slug: "trigonometry", title: "Trigonometry", description: "Angles, identities and periodic functions.", lessons: [representative("unit-circle-values", "Unit-circle values without memorising", "Use coordinates on the unit circle to find sine and cosine.", "At angle θ, the point on the unit circle is (cos θ, sin θ). Reference triangles give the exact coordinates for 0°, 30°, 45°, 60° and 90°; signs then follow from the quadrant.", "At 150°, the reference angle is 30° and the point is in quadrant II. Therefore cos 150° = −√3/2 and sin 150° = 1/2.", "Find sin 225°.", "The reference angle is 45° and quadrant III has negative y, so sin 225° = −√2/2.")] },
      { slug: "coordinate-geometry", title: "Coordinate Geometry", description: "Lines, circles and conic sections.", lessons: [representative("line-from-two-points", "A line through two points", "Build the equation of a line from two coordinates.", "For points (x₁,y₁) and (x₂,y₂), first calculate slope m = (y₂−y₁)/(x₂−x₁). Then use point-slope form y−y₁ = m(x−x₁). A vertical line is the special case x = constant.", "Through (2,3) and (6,11), m = 8/4 = 2. So y−3 = 2(x−2), or y = 2x−1.", "Find the line through (1,4) and (3,10).", "m = 6/2 = 3, so y−4 = 3(x−1), which simplifies to y = 3x+1.")] },
      { slug: "calculus", title: "Calculus", description: "Limits, differentiation and integration.", lessons: [representative("derivative-as-rate", "Derivative as an instantaneous rate", "Interpret a derivative as slope and rate of change.", "The derivative f′(x) measures how quickly f changes at a particular input. For f(x)=xⁿ, the power rule gives f′(x)=nxⁿ⁻¹. Substituting an x-value then gives the tangent slope there.", "If s(t)=3t² gives position, velocity is s′(t)=6t. At t=4 s, the instantaneous velocity is 24 m/s.", "For f(x)=2x³, what is the slope at x=2?", "f′(x)=6x², so f′(2)=24.")] },
      { slug: "vectors", title: "Vectors", description: "Magnitude, direction and spatial reasoning.", lessons: [representative("vector-components", "Working with vector components", "Resolve and combine vectors using components.", "A two-dimensional vector a = (aₓ,aᵧ) stores independent horizontal and vertical effects. Add vectors component by component. Its magnitude is |a| = √(aₓ²+aᵧ²).", "For a=(3,4), |a|=√(9+16)=5. If b=(−1,2), then a+b=(2,6).", "Find the magnitude of v=(5,12).", "|v|=√(25+144)=√169=13.")] },
      { slug: "probability", title: "Probability", description: "Events, counting and uncertainty.", lessons: [representative("conditional-probability", "Probability after new information", "Calculate conditional probability from an intersection.", "Conditional probability updates the sample space after event B is known: P(A|B)=P(A∩B)/P(B), provided P(B)>0. Both numerator and denominator must refer to the same updated condition.", "In a class, 12 students study Physics, and 8 of those study Mathematics. Given that a selected student studies Physics, P(Mathematics|Physics)=8/12=2/3.", "If P(A∩B)=0.18 and P(B)=0.30, find P(A|B).", "P(A|B)=0.18/0.30=0.60.")] },
      { slug: "statistics", title: "Statistics", description: "Distributions and measures of data.", lessons: [representative("mean-and-spread", "Centre and spread tell different stories", "Compare mean and standard deviation as complementary summaries.", "The mean locates the centre of numerical data, while standard deviation describes typical distance from that centre. Equal means do not imply equal consistency; the set with smaller standard deviation is more tightly clustered.", "Both {4,5,6} and {0,5,10} have mean 5, but the second set has much greater spread and therefore a larger standard deviation.", "Which is more consistent: a data set with standard deviation 1.2 or one with 4.8?", "The set with standard deviation 1.2 is more consistent because its values cluster more closely around the mean.")] },
    ],
  },
  {
    slug: "physics", title: "Physics", short: "P", color: "#2563eb",
    chapters: [
      { slug: "mechanics", title: "Mechanics", description: "Motion, forces, energy and momentum.", lessons: [representative("newtons-second-law", "Force changes motion", "Apply Newton's second law to one-dimensional motion.", "Newton's second law relates net force to acceleration: Fnet = ma. Always combine forces with their directions before using the equation; a force is not the same thing as a net force.", "A 2 kg block has 10 N to the right and 4 N to the left. Fnet = 6 N right, so a = 6/2 = 3 m/s² right.", "A 5 kg cart experiences a net force of 15 N. What is its acceleration?", "a = Fnet/m = 15/5 = 3 m/s² in the direction of the net force.")], },
      { slug: "thermodynamics", title: "Thermodynamics", description: "Heat, work and energy transfer.", lessons: [representative("first-law", "Tracking thermal energy", "Apply the first law with a consistent sign convention.", "Using ΔU = Q − W, Q is heat added to the system and W is work done by the system. The equation is an energy ledger: internal energy changes only through heat transfer and work.", "A gas absorbs 500 J and does 180 J of work. ΔU = 500−180 = 320 J.", "A system receives 240 J of heat and has 90 J of work done on it. Find ΔU.", "Work done by the system is −90 J, so ΔU = 240−(−90)=330 J.")] },
      { slug: "waves", title: "Waves", description: "Oscillations, sound and wave behaviour.", lessons: [representative("wave-speed", "Linking speed, frequency and wavelength", "Use v=fλ and interpret each quantity.", "A wave advances one wavelength during each cycle. If f cycles pass per second and each cycle spans wavelength λ, its speed is v=fλ. Frequency is set by the source; wavelength changes when speed changes.", "A 50 Hz wave with wavelength 6 m travels at v=50×6=300 m/s.", "A wave travels at 340 m/s with frequency 170 Hz. Find its wavelength.", "λ=v/f=340/170=2 m.")] },
      { slug: "electricity", title: "Electricity", description: "Charge, fields, potential and circuits.", lessons: [representative("ohms-law", "Voltage, current and resistance", "Use Ohm's law for an ohmic conductor.", "For an ohmic conductor at constant physical conditions, V=IR. Voltage is the energy transferred per unit charge, current is charge flow per second, and resistance measures opposition to that flow.", "Across a 4 Ω resistor carrying 3 A, V=3×4=12 V.", "What current flows through a 10 Ω resistor connected across 20 V?", "I=V/R=20/10=2 A.")] },
      { slug: "magnetism", title: "Magnetism", description: "Magnetic fields and electromagnetic effects.", lessons: [representative("force-on-charge", "A moving charge in a magnetic field", "Determine the magnitude of magnetic force on a charge.", "A charge q moving at speed v in magnetic field B experiences force F=qvB sin θ. The force is largest for perpendicular motion and zero for motion parallel to the field.", "For q=2 C, v=3 m/s, B=4 T and θ=90°, F=2×3×4=24 N.", "What force acts when the velocity is parallel to the magnetic field?", "θ=0°, so sin θ=0 and the magnetic force is zero.")] },
      { slug: "optics", title: "Optics", description: "Reflection, refraction and optical systems.", lessons: [representative("snells-law", "Why light bends", "Use Snell's law at a boundary.", "Snell's law n₁sin θ₁=n₂sin θ₂ relates angles measured from the normal. Light bends toward the normal when it enters a medium with larger refractive index.", "From air into glass, n₁=1.0, n₂=1.5 and θ₁=30°. sin θ₂=(1/1.5)×0.5=1/3, so θ₂≈19.5°.", "Does light bend toward or away from the normal when moving from air into water?", "Toward the normal, because water has a larger refractive index than air.")] },
      { slug: "modern-physics", title: "Modern Physics", description: "Atoms, nuclei and quantum ideas.", lessons: [representative("photon-energy", "Light arrives in energy packets", "Relate photon energy to frequency.", "A photon carries energy E=hf, where h is Planck's constant and f is frequency. Higher-frequency radiation therefore carries more energy per photon; intensity and photon energy are different ideas.", "If one photon has twice another's frequency, it has twice the energy, regardless of beam intensity.", "Which has greater photon energy: red light or ultraviolet light?", "Ultraviolet light, because its frequency is higher and E is proportional to f.")] },
    ],
  },
  {
    slug: "chemistry", title: "Chemistry", short: "C", color: "#7c3aed",
    chapters: [
      { slug: "physical-chemistry", title: "Physical Chemistry", description: "Quantities, energetics and equilibrium.", lessons: [representative("mole-concept", "The mole as a counting unit", "Convert between amount of substance and number of particles.", "One mole contains Avogadro's constant, 6.022 × 10²³ representative particles. Use N = nNA, where N is particle count, n is amount in moles and NA is Avogadro's constant.", "For 0.50 mol of oxygen molecules, N = 0.50 × 6.022 × 10²³ = 3.011 × 10²³ molecules.", "How many molecules are in 2.0 mol of water?", "N = 2.0 × 6.022 × 10²³ = 1.2044 × 10²⁴ water molecules.")], },
      { slug: "inorganic-chemistry", title: "Inorganic Chemistry", description: "Periodic trends, bonding and compounds.", lessons: [representative("periodic-radius", "Why atomic size changes", "Explain atomic-radius trends using attraction and shielding.", "Across a period, nuclear charge increases while electrons enter the same main shell, so stronger effective attraction usually reduces atomic radius. Down a group, extra shells and shielding make atoms larger.", "Across period 3, sodium is larger than chlorine because chlorine's greater effective nuclear charge pulls its valence shell inward more strongly.", "Which is larger, lithium or sodium?", "Sodium. It lies below lithium and has an additional occupied electron shell.")] },
      { slug: "organic-chemistry", title: "Organic Chemistry", description: "Carbon compounds, mechanisms and reactions.", lessons: [representative("functional-groups", "Functional groups predict behaviour", "Recognise how functional groups classify organic compounds.", "A functional group is the reactive structural feature of an organic molecule. The hydroxyl group −OH characterises alcohols, −COOH carboxylic acids, and C=C alkenes. The carbon skeleton affects size, while the functional group strongly shapes reactions.", "CH₃CH₂OH contains −OH and is ethanol, an alcohol. CH₃COOH contains −COOH and is ethanoic acid.", "Which class contains the molecule CH₂=CH₂?", "It is an alkene because it contains a carbon–carbon double bond.")] },
    ],
  },
];

export function findJuniorsChapter(subjectSlug: string, chapterSlug: string) {
  const subject = juniorsCurriculum.find((item) => item.slug === subjectSlug);
  const chapter = subject?.chapters.find((item) => item.slug === chapterSlug);
  return subject && chapter ? { subject, chapter } : null;
}

export const publishedJuniorsLessons = juniorsCurriculum.flatMap(subject => subject.chapters.flatMap(chapter => chapter.lessons.map(lesson => ({ subject, chapter, lesson }))));
