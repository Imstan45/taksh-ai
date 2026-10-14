export type ExamTag = "jee-main" | "tg-eapcet" | "ap-eapcet";
export type SyllabusTopic = { title: string; subtopics: string[]; exams?: ExamTag[] };
export type SyllabusChapter = { subject: "mathematics" | "physics" | "chemistry"; chapter: string; topics: SyllabusTopic[] };

const all: ExamTag[] = ["jee-main", "tg-eapcet", "ap-eapcet"];
const topic = (title:string, subtopics:string[], exams:ExamTag[]=all):SyllabusTopic => ({title,subtopics,exams});

export const juniorsSyllabus:SyllabusChapter[] = [
  {subject:"mathematics",chapter:"algebra",topics:[
    topic("Sets, relations and functions",["Set operations","Relations and equivalence relations","Domain, range and composition","One-to-one, onto and inverse functions"]),
    topic("Complex numbers",["Algebra of complex numbers","Argand plane","Modulus and argument","Polar form","De Moivre theorem","Roots of unity"]),
    topic("Quadratic equations",["Nature of roots","Relations between roots and coefficients","Formation of equations","Quadratic inequalities","Maximum and minimum values"]),
    topic("Matrices and determinants",["Types and operations","Transpose and inverse","Determinant properties","Adjoint method","Rank and consistency","Linear systems"]),
    topic("Permutations and combinations",["Counting principle","Permutations with and without repetition","Circular permutations","Restricted arrangements","Combinations and identities"]),
    topic("Binomial theorem",["Positive integral index","General and middle terms","Binomial coefficients","Rational index and approximations"]),
    topic("Sequences and series",["Arithmetic progression","Geometric progression","Means","Finite and infinite sums","Special series"]),
    topic("Mathematical induction",["Principle of induction","Divisibility proofs","Inequality proofs"]),
    topic("Partial fractions",["Distinct linear factors","Repeated linear factors","Irreducible quadratic factors","Improper rational expressions"]),
  ]},
  {subject:"mathematics",chapter:"trigonometry",topics:[
    topic("Trigonometric functions",["Angle measure","Signs and periodicity","Graphs","Compound angles","Multiple and submultiple angles","Sum-to-product transformations"]),
    topic("Trigonometric equations",["Principal solutions","General solutions","Equation transformations"]),
    topic("Inverse trigonometric functions",["Principal value branches","Graphs","Identities and transformations"]),
    topic("Triangle properties",["Sine rule","Cosine rule","Projection rule","Half-angle formulae","Area, in-circle and ex-circles"]),
    topic("Hyperbolic functions",["Definitions and graphs","Identities","Inverse hyperbolic functions"],["tg-eapcet","ap-eapcet"]),
  ]},
  {subject:"mathematics",chapter:"coordinate-geometry",topics:[
    topic("Straight lines",["Slope and intercept forms","Angle between lines","Distance from a point","Family of lines","Concurrency"]),
    topic("Pair of straight lines",["Homogeneous second-degree equation","Angle bisectors","Parallel and perpendicular conditions","Point of intersection"],["tg-eapcet","ap-eapcet"]),
    topic("Circles",["Standard and general equations","Tangent and normal","Chord of contact","Pole and polar","Common tangents","Radical axis"]),
    topic("Parabola",["Standard forms","Focus and directrix","Parametric coordinates","Tangent and normal","Chord properties"]),
    topic("Ellipse",["Standard equation","Eccentricity and foci","Parametric coordinates","Tangent and normal","Auxiliary circle"]),
    topic("Hyperbola",["Standard and rectangular forms","Asymptotes","Parametric coordinates","Tangent and normal","Director circle"]),
    topic("Three-dimensional geometry",["Coordinates and section formula","Direction ratios and cosines","Lines in space","Planes","Angles and shortest distance"]),
  ]},
  {subject:"mathematics",chapter:"calculus",topics:[
    topic("Limits and continuity",["Standard limits","Algebra of limits","Left and right limits","Continuity and discontinuity"]),
    topic("Differentiation",["First principles","Product, quotient and chain rules","Implicit and parametric differentiation","Second derivatives"]),
    topic("Applications of derivatives",["Tangents and normals","Rate of change","Increasing and decreasing functions","Maxima and minima","Mean value theorems"]),
    topic("Indefinite integration",["Standard integrals","Substitution","Integration by parts","Partial fractions","Trigonometric integrals"]),
    topic("Definite integration",["Fundamental theorem","Properties","Limit of a sum","Area under curves"]),
    topic("Differential equations",["Order and degree","Formation","Variable separable equations","Homogeneous equations","Linear differential equations"]),
  ]},
  {subject:"mathematics",chapter:"vectors",topics:[
    topic("Vector algebra",["Types and components","Addition and scalar multiplication","Section formula","Linear combinations"]),
    topic("Vector products",["Dot product","Cross product","Scalar triple product","Vector triple product","Geometric applications"]),
    topic("Lines and planes",["Vector equation of a line","Vector equation of a plane","Coplanarity","Skew lines and shortest distance"]),
  ]},
  {subject:"mathematics",chapter:"probability",topics:[
    topic("Probability foundations",["Sample spaces and events","Classical and axiomatic probability","Addition theorem","Complementary events"]),
    topic("Conditional probability",["Multiplication theorem","Independent events","Total probability","Bayes theorem"]),
    topic("Random variables",["Discrete random variables","Probability distributions","Expectation and variance","Binomial distribution","Poisson distribution"]),
  ]},
  {subject:"mathematics",chapter:"statistics",topics:[
    topic("Measures of dispersion",["Range","Mean deviation","Variance","Standard deviation","Coefficient of variation"]),
    topic("Data interpretation",["Grouped and ungrouped data","Comparing distributions","Equal means and unequal variances"]),
  ]},
  {subject:"physics",chapter:"mechanics",topics:[
    topic("Units and measurements",["SI units","Significant figures","Dimensions","Measurement errors","Vernier calipers and screw gauge"]),
    topic("Kinematics",["Motion in one dimension","Vectors and relative velocity","Projectile motion","Uniform circular motion"]),
    topic("Laws of motion",["Newton laws","Free-body diagrams","Friction","Centripetal force","Impulse"]),
    topic("Work, energy and power",["Work-energy theorem","Kinetic and potential energy","Conservative forces","Collisions","Power"]),
    topic("System of particles",["Centre of mass","Momentum conservation","Torque","Angular momentum"]),
    topic("Rotational motion",["Moment of inertia","Axis theorems","Rotational dynamics","Rolling motion","Equilibrium"]),
    topic("Gravitation",["Universal law","Acceleration due to gravity","Potential and field","Satellites","Escape speed"]),
    topic("Mechanical properties of matter",["Elasticity","Fluid pressure","Continuity equation","Bernoulli theorem","Viscosity","Surface tension"]),
  ]},
  {subject:"physics",chapter:"thermodynamics",topics:[
    topic("Thermal properties",["Temperature scales","Thermal expansion","Calorimetry","Heat transfer","Newton law of cooling"]),
    topic("Kinetic theory",["Ideal gas equation","Degrees of freedom","Equipartition","Mean free path","Molecular speeds"]),
    topic("Thermodynamic processes",["State variables","First law","Isothermal and adiabatic processes","Heat engines","Second law and entropy"]),
  ]},
  {subject:"physics",chapter:"waves",topics:[
    topic("Oscillations",["Simple harmonic motion","Energy in SHM","Spring systems","Simple pendulum","Damped and forced oscillations","Resonance"]),
    topic("Wave motion",["Progressive waves","Superposition","Standing waves","Beats","Doppler effect","Sound waves"]),
  ]},
  {subject:"physics",chapter:"electricity",topics:[
    topic("Electrostatics",["Coulomb law","Electric field and flux","Gauss law","Electric potential","Dipoles","Capacitance and dielectrics"]),
    topic("Current electricity",["Drift velocity","Ohm law","Resistivity","Series and parallel circuits","Kirchhoff laws","Cells","Wheatstone bridge","Potentiometer"]),
  ]},
  {subject:"physics",chapter:"magnetism",topics:[
    topic("Magnetic effects of current",["Biot-Savart law","Ampere law","Force on a charge","Force on a conductor","Cyclotron","Galvanometer"]),
    topic("Magnetism and matter",["Bar magnet","Magnetic dipole","Earth magnetism","Dia-, para- and ferromagnetism"]),
    topic("Electromagnetic induction",["Magnetic flux","Faraday and Lenz laws","Motional emf","Inductance","Eddy currents","AC generator"]),
    topic("Alternating current",["Phasors","RLC circuits","Resonance","Power factor","Transformers"]),
    topic("Electromagnetic waves",["Displacement current","Wave properties","Electromagnetic spectrum"]),
  ]},
  {subject:"physics",chapter:"optics",topics:[
    topic("Ray optics",["Reflection","Spherical mirrors","Refraction","Total internal reflection","Lenses","Prisms","Optical instruments"]),
    topic("Wave optics",["Huygens principle","Interference","Young double slit","Diffraction","Polarisation"]),
  ]},
  {subject:"physics",chapter:"modern-physics",topics:[
    topic("Dual nature",["Photoelectric effect","Einstein equation","Photon momentum","de Broglie wavelength","Davisson-Germer experiment"]),
    topic("Atoms",["Rutherford model","Bohr model","Hydrogen spectrum","Energy levels"]),
    topic("Nuclei",["Nuclear size","Mass defect and binding energy","Radioactive decay","Fission and fusion"]),
    topic("Semiconductors",["Energy bands","Intrinsic and extrinsic semiconductors","p-n junction","Diodes","Transistors","Logic gates"]),
    topic("Experimental skills",["Instrument reading","Graph interpretation","Circuit experiments","Error estimation"],["jee-main"]),
  ]},
  {subject:"chemistry",chapter:"physical-chemistry",topics:[
    topic("Some basic concepts",["Atomic and molecular masses","Mole concept","Stoichiometry","Limiting reagent","Concentration terms"]),
    topic("Atomic structure",["Electromagnetic radiation","Bohr model","Quantum numbers","Orbitals","Electronic configuration"]),
    topic("States of matter",["Gas laws","Kinetic theory","Real gases","Liquefaction","Liquid properties"]),
    topic("Chemical thermodynamics",["System and surroundings","First law","Enthalpy changes","Hess law","Entropy","Gibbs energy"]),
    topic("Solutions",["Concentration","Vapour pressure","Raoult law","Colligative properties","Abnormal molar mass"]),
    topic("Equilibrium",["Equilibrium constants","Le Chatelier principle","Acid-base theories","pH","Buffers","Solubility product"]),
    topic("Redox and electrochemistry",["Oxidation number","Balancing redox reactions","Conductance","Electrochemical cells","Nernst equation","Electrolysis"]),
    topic("Chemical kinetics",["Rate laws","Order and molecularity","Integrated equations","Half-life","Arrhenius equation","Catalysis"]),
    topic("Surface chemistry",["Adsorption","Catalysis","Colloids","Emulsions"],["tg-eapcet","ap-eapcet"]),
    topic("Solid state",["Crystal lattices","Unit cells","Packing","Defects","Electrical and magnetic properties"],["tg-eapcet","ap-eapcet"]),
  ]},
  {subject:"chemistry",chapter:"inorganic-chemistry",topics:[
    topic("Periodicity",["Modern periodic law","Atomic and ionic radii","Ionisation enthalpy","Electron gain enthalpy","Electronegativity","Oxidation states"]),
    topic("Chemical bonding",["Lewis structures","Ionic bonding","VSEPR","Valence bond theory","Hybridisation","Molecular orbital theory","Hydrogen bonding"]),
    topic("Hydrogen",["Isotopes and hydrides","Water and hardness","Hydrogen peroxide","Heavy water","Hydrogen as fuel"],["tg-eapcet","ap-eapcet"]),
    topic("s-block elements",["Group 1 trends","Group 2 trends","Important sodium compounds","Calcium compounds","Biological importance"]),
    topic("p-block elements",["Group 13","Group 14","Group 15","Group 16","Group 17","Group 18","Important compounds"]),
    topic("d- and f-block elements",["Electronic configuration","Oxidation states","Colour and magnetism","Lanthanide contraction","Actinides"]),
    topic("Coordination compounds",["Nomenclature","Isomerism","Bonding theories","Crystal-field splitting","Stability and applications"]),
    topic("Metallurgy",["Concentration of ores","Extraction principles","Refining","Thermodynamic principles"],["tg-eapcet","ap-eapcet"]),
    topic("Qualitative analysis",["Cation tests","Anion tests","Principles of salt analysis"],["jee-main"]),
  ]},
  {subject:"chemistry",chapter:"organic-chemistry",topics:[
    topic("Purification and characterisation",["Crystallisation and distillation","Chromatography","Qualitative analysis","Empirical formula"]),
    topic("Organic principles",["Nomenclature","Isomerism","Electronic effects","Reaction intermediates","Reaction types"]),
    topic("Hydrocarbons",["Alkanes","Alkenes","Alkynes","Aromatic hydrocarbons","Electrophilic substitution"]),
    topic("Halo compounds",["Haloalkanes","Haloarenes","Nucleophilic substitution","Environmental effects"]),
    topic("Oxygen compounds",["Alcohols","Phenols","Ethers","Aldehydes","Ketones","Carboxylic acids"]),
    topic("Nitrogen compounds",["Amines","Diazonium salts","Cyanides and isocyanides"]),
    topic("Biomolecules",["Carbohydrates","Proteins","Enzymes","Vitamins","Nucleic acids"]),
    topic("Polymers",["Polymerisation","Addition polymers","Condensation polymers","Biodegradable polymers"],["tg-eapcet","ap-eapcet"]),
    topic("Chemistry in everyday life",["Drugs","Food additives","Cleansing agents"],["tg-eapcet","ap-eapcet"]),
    topic("Practical chemistry",["Functional-group tests","Preparation principles","Titration and salt analysis","Laboratory principles"]),
  ]},
];

export function syllabusFor(subject:string,chapter:string){return juniorsSyllabus.find(item=>item.subject===subject&&item.chapter===chapter)}
export const syllabusTotals={
  chapters:juniorsSyllabus.length,
  topics:juniorsSyllabus.reduce((n,c)=>n+c.topics.length,0),
  subtopics:juniorsSyllabus.reduce((n,c)=>n+c.topics.reduce((m,t)=>m+t.subtopics.length,0),0),
};
