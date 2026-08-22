import { cn } from '@/lib/utils';

type Props = { className?: string; variant?: number };

const PAPER = '#fbfaf7';
const INK = '#1a2230';
const INK_LIGHT = '#3b4658';
const RED = '#9a2a2a';
const BLUE = '#1e3a8a';

function Header({ variant }: { variant: number }) {
  const titles = [
    'Étude de fonctions — Devoir maison n°3',
    'Suites numériques — Exercices d\'application',
    'Dérivation — Contrôle continu',
    'Probabilités — Série d\'exercices',
    'Équations différentielles — TD',
    'Géométrie dans l\'espace — Activité',
    'Limites et continuité — Exercices',
    'Étude de fonctions — Travaux dirigés',
    'Trigonométrie — Problème',
    'Suites et récurrence — Démonstrations',
    'Généralités sur les fonctions — Exercices',
    'Barycentre — Activité',
    'Fonctions exponentielles — Application',
    'Variables aléatoires — Problème',
  ];
  const t = titles[(variant - 1) % titles.length];
  return (
    <g>
      <text x="40" y="40" fontSize="11" fontWeight="700" fill={INK} fontFamily="Georgia, serif">
        WahaMath
      </text>
      <line x1="40" y1="48" x2="560" y2="48" stroke={INK} strokeWidth="1" opacity="0.6" />
      <text x="40" y="68" fontSize="13" fontWeight="700" fill={INK} fontFamily="Georgia, serif">
        {t}
      </text>
      <text x="40" y="84" fontSize="9" fill={INK_LIGHT} fontFamily="Georgia, serif">
        Niveau: Sciences Mathématiques — Durée: 1h30 — Coefficient: 3
      </text>
    </g>
  );
}

function ExercisePageSVG({ className, variant = 1 }: Props) {
  const v = ((variant - 1) % 14) + 1;
  return (
    <svg
      className={cn(className)}
      viewBox="0 0 600 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Énoncé de l'exercice"
    >
      <rect width="600" height="800" fill={PAPER} />
      {/* subtle paper texture lines */}
      <g opacity="0.04">
        {Array.from({ length: 40 }).map((_, i) => (
          <line key={i} x1="0" y1={i * 20} x2="600" y2={i * 20} stroke={INK} strokeWidth="0.5" />
        ))}
      </g>
      {/* margin line */}
      <line x1="70" y1="20" x2="70" y2="780" stroke={RED} strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />

      <Header variant={v} />

      {/* Exercise content variants */}
      {v === 1 && <VariantFunctionRational />}
      {v === 2 && <VariantSuites />}
      {v === 3 && <VariantDerivation />}
      {v === 4 && <VariantProbabilities />}
      {v === 5 && <VariantEquationDiff />}
      {v === 6 && <VariantGeometry />}
      {v === 7 && <VariantLimites />}
      {v === 8 && <VariantExpFunct />}
      {v === 9 && <VariantTrigono />}
      {v === 10 && <VariantRecurrence />}
      {v === 11 && <VariantGeneralites />}
      {v === 12 && <VariantBarycentre />}
      {v === 13 && <VariantExpCroissance />}
      {v === 14 && <VariantVariablesAleatoires />}

      {/* page number */}
      <text x="560" y="785" fontSize="8" fill={INK_LIGHT} fontFamily="Georgia, serif" opacity="0.5">
        Page 1/2
      </text>
    </svg>
  );
}

function Q({ x, y, n, children }: { x: number; y: number; n: string; children: React.ReactNode }) {
  return (
    <g>
      <text x={x} y={y} fontSize="10" fontWeight="700" fill={INK} fontFamily="Georgia, serif">{n}</text>
      {children}
    </g>
  );
}

function T({ x, y, s = 9, fill = INK, children }: { x: number; y: number; s?: number; fill?: string; children: React.ReactNode }) {
  return <text x={x} y={y} fontSize={s} fill={fill} fontFamily="Georgia, serif">{children}</text>;
}

function ItalicT({ x, y, s = 9, children }: { x: number; y: number; s?: number; children: React.ReactNode }) {
  return <text x={x} y={y} fontSize={s} fill={INK} fontFamily="Georgia, serif" fontStyle="italic">{children}</text>;
}

function GraphAxes({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g stroke={INK} strokeWidth="0.7" fill="none" opacity="0.7">
      <line x1={x} y1={cy} x2={x + w} y2={cy} />
      <line x1={cx} y1={y} x2={cx} y2={y + h} />
      <polygon points={`${x + w},${cy} ${x + w - 5},${cy - 3} ${x + w - 5},${cy + 3}`} fill={INK} stroke="none" />
      <polygon points={`${cx},${y} ${cx - 3},${y + 5} ${cx + 3},${y + 5}`} fill={INK} stroke="none" />
      <text x={x + w - 8} y={cy + 14} fontSize="7" fill={INK} fontFamily="Georgia, serif">x</text>
      <text x={cx + 6} y={y + 8} fontSize="7" fill={INK} fontFamily="Georgia, serif">y</text>
      <text x={cx - 12} y={cy + 12} fontSize="7" fill={INK} fontFamily="Georgia, serif">O</text>
      {/* ticks */}
      {Array.from({ length: 5 }).map((_, i) => (
        <g key={i}>
          <line x1={cx + (i + 1) * 20} y1={cy - 3} x2={cx + (i + 1) * 20} y2={cy + 3} />
          <line x1={cx - (i + 1) * 20} y1={cy - 3} x2={cx - (i + 1) * 20} y2={cy + 3} />
          <line x1={cx - 3} y1={cy + (i + 1) * 18} x2={cx + 3} y2={cy + (i + 1) * 18} />
          <line x1={cx - 3} y1={cy - (i + 1) * 18} x2={cx + 3} y2={cy - (i + 1) * 18} />
        </g>
      ))}
    </g>
  );
}

function VariantFunctionRational() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit la fonction f définie sur ℝ \ {'{'}−1, 1{'}'} par:</T>
      <ItalicT x={120} y={132} s={12}>f(x) = (2x² + 3x − 1) / (x² − 1)</ItalicT>
      <T x={40} y={155} s={9}>On note (C_f) sa courbe représentative dans un repère orthonormé.</T>

      <Q x={40} y={185} n="1.">
        <T x={60} y={185}>Déterminer le domaine de définition D_f de la fonction f.</T>
      </Q>
      <Q x={40} y={215} n="2.">
        <T x={60} y={215}>Calculer les limites de f aux bornes de D_f. En déduire l'existence</T>
        <T x={60} y={228}>d'asymptotes éventuelles que l'on précisera.</T>
      </Q>
      <Q x={40} y={255} n="3.">
        <T x={60} y={255}>Montrer que pour tout x ∈ D_f :</T>
        <ItalicT x={90} y={275} s={11}>f'(x) = (5x² − 2x + 3) / (x² − 1)²</ItalicT>
        <T x={60} y={295}>Étudier le signe de f'(x) et dresser le tableau de variations de f.</T>
      </Q>
      <Q x={40} y={325} n="4.">
        <T x={60} y={325}>Tracer la courbe (C_f) ainsi que ses asymptotes.</T>
      </Q>

      <GraphAxes x={150} y={360} w={300} h={240} />
      <path d="M 170 580 Q 250 380 300 370 Q 350 360 430 580" stroke={BLUE} strokeWidth="1.2" fill="none" opacity="0.8" />
      <path d="M 170 360 Q 230 560 300 570" stroke={BLUE} strokeWidth="1.2" fill="none" opacity="0.5" strokeDasharray="3 2" />
      <T x={440} y={590} s={7}>(C_f)</T>
    </g>
  );
}

function VariantSuites() {
  return (
    <g>
      <T x={40} y={110} s={9}>On considère la suite (u_n) définie par u₀ = 1 et pour tout n ∈ ℕ:</T>
      <ItalicT x={130} y={132} s={12}>u_(n+1) = (u_n² + 2) / 3</ItalicT>

      <Q x={40} y={162} n="1.">
        <T x={60} y={162}>Calculer u₁, u₂ et u₃.</T>
      </Q>
      <Q x={40} y={190} n="2.">
        <T x={60} y={190}>Montrer par récurrence que pour tout n ∈ ℕ, 1 ≤ u_n ≤ 2.</T>
      </Q>
      <Q x={40} y={220} n="3.">
        <T x={60} y={220}>Étudier la monotonie de la suite (u_n).</T>
      </Q>
      <Q x={40} y={250} n="4.">
        <T x={60} y={250}>En déduire que (u_n) est convergente et déterminer sa limite ℓ.</T>
      </Q>
      <Q x={40} y={280} n="5.">
        <T x={60} y={280}>On pose v_n = u_n − ℓ. Montrer que (v_n) est géométrique.</T>
        <T x={60} y={295}>Exprimer v_n en fonction de n puis u_n en fonction de n.</T>
      </Q>

      {/* staircase visualization */}
      <g stroke={INK} strokeWidth="0.7" fill="none" opacity="0.6">
        <GraphAxesSimple x={150} y={360} w={260} h={180} />
        <path d="M 150 520 L 175 490 L 200 470 L 225 458 L 250 452 L 275 449 L 300 448 L 325 447" stroke={BLUE} strokeWidth="1" />
        <path d="M 175 490 L 175 520 M 200 470 L 200 520 M 225 458 L 225 520" stroke={BLUE} opacity="0.5" />
      </g>
      <T x={420} y={470} s={7}>u_n → ℓ</T>
    </g>
  );
}

function GraphAxesSimple({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={INK} strokeWidth="0.7" />
      <line x1={x} y1={y} x2={x} y2={y + h} stroke={INK} strokeWidth="0.7" />
    </g>
  );
}

function VariantDerivation() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit la fonction g définie sur ℝ par:</T>
      <ItalicT x={140} y={132} s={12}>g(x) = x³ − 3x² + 2</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Calculer g'(x) et g''(x).</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Étudier le signe de g'(x) sur ℝ.</T></Q>
      <Q x={40} y={218} n="3.">
        <T x={60} y={218}>Dresser le tableau de variations de g.</T>
      </Q>
      <Q x={40} y={246} n="4."><T x={60} y={246}>Déterminer les extrema locaux de g.</T></Q>

      {/* variation table */}
      <g stroke={INK} strokeWidth="0.6" opacity="0.7">
        <line x1={90} y1={290} x2={480} y2={290} />
        <line x1={90} y1={330} x2={480} y2={330} />
        <line x1={90} y1={370} x2={480} y2={370} />
        <line x1={90} y1={290} x2={90} y2={370} />
        <line x1={210} y1={290} x2={210} y2={370} />
        <line x1={350} y1={290} x2={350} y2={370} />
        <line x1={480} y1={290} x2={480} y2={370} />
      </g>
      <T x={100} y={312} s={8}>x</T>
      <T x={100} y={352} s={8}>g'(x)</T>
      <ItalicT x={140} y={312} s={8}>−∞</ItalicT>
      <ItalicT x={270} y={312} s={8}>0</ItalicT>
      <ItalicT x={400} y={312} s={8}>2</ItalicT>
      <ItalicT x={455} y={312} s={8}>+∞</ItalicT>
      <T x={150} y={352} s={14}>+</T>
      <T x={280} y={352} s={14}>0</T>
      <T x={370} y={352} s={14}>−</T>
      <T x={430} y={352} s={14}>+</T>

      <GraphAxes x={150} y={420} w={280} h={200} />
      <path d="M 170 600 Q 250 420 290 440 Q 330 460 360 520 Q 390 580 430 480" stroke={BLUE} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function VariantProbabilities() {
  return (
    <g>
      <T x={40} y={110} s={9}>Dans un lycée, 60% des élèves sont des filles. Parmi les filles, 30% portent</T>
      <T x={40} y={124} s={9}>des lunettes, et parmi les garçons, 20% portent des lunettes.</T>

      <Q x={40} y={152} n="1."><T x={60} y={152}>On choisit un élève au hasard. Quelle est la probabilité qu'il porte des lunettes ?</T></Q>
      <Q x={40} y={180} n="2."><T x={60} y={180}>Sachant que l'élève porte des lunettes, quelle est la probabilité que ce soit une fille ?</T></Q>
      <Q x={40} y={208} n="3."><T x={60} y={208}>On choisit 3 élèves indépendamment. Probabilité qu'au moins un porte des lunettes ?</T></Q>

      {/* tree diagram */}
      <g stroke={INK} strokeWidth="0.7" opacity="0.7">
        <line x1={150} y1={300} x2={220} y2={260} />
        <line x1={150} y1={300} x2={220} y2={340} />
        <line x1={220} y1={260} x2={300} y2={240} />
        <line x1={220} y1={260} x2={300} y2={280} />
        <line x1={220} y1={340} x2={300} y2={320} />
        <line x1={220} y1={340} x2={300} y2={360} />
      </g>
      <T x={130} y={305} s={8}>Élève</T>
      <T x={225} y={255} s={7}>F (0.6)</T>
      <T x={225} y={350} s={7}>G (0.4)</T>
      <T x={305} y={244} s={7}>L (0.3)</T>
      <T x={305} y={284} s={7}>L̄ (0.7)</T>
      <T x={305} y={324} s={7}>L (0.2)</T>
      <T x={305} y={364} s={7}>L̄ (0.8)</T>
    </g>
  );
}

function VariantEquationDiff() {
  return (
    <g>
      <T x={40} y={110} s={9}>On considère l'équation différentielle (E):</T>
      <ItalicT x={160} y={132} s={12}>y' − 2y = 3</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Résoudre l'équation homogène (E₀): y' − 2y = 0.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Déterminer une solution particulière constante de (E).</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>En déduire la solution générale de (E).</T></Q>
      <Q x={40} y={246} n="4."><T x={60} y={246}>Déterminer la solution unique vérifiant y(0) = 1.</T></Q>

      <GraphAxes x={150} y={320} w={300} h={240} />
      <path d="M 170 540 Q 260 360 300 340 Q 340 330 450 335" stroke={BLUE} strokeWidth="1.2" fill="none" />
      <T x={455} y={340} s={7}>y = Ce^(2x) − 3/2</T>
    </g>
  );
}

function VariantGeometry() {
  return (
    <g>
      <T x={40} y={110} s={9}>Dans l'espace muni d'un repère orthonormé (O; i, j, k), on donne les points:</T>
      <ItalicT x={80} y={132} s={10}>A(1; 0; 2), B(3; 1; −1), C(0; 2; 1)</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Calculer les coordonnées des vecteurs AB et AC.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Calculer le produit vectoriel AB ∧ AC.</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>En déduire une équation cartésienne du plan (ABC).</T></Q>
      <Q x={40} y={246} n="4."><T x={60} y={246}>Calculer l'aire du triangle ABC.</T></Q>

      {/* 3D axes */}
      <g stroke={INK} strokeWidth="0.8" fill="none" opacity="0.7">
        <line x1={200} y1={500} x2={400} y2={500} />
        <line x1={200} y1={500} x2={200} y2={300} />
        <line x1={200} y1={500} x2={140} y2={560} />
        <polygon points="250,420 330,460 280,500 200,460" stroke={BLUE} fill={BLUE} fillOpacity="0.08" strokeWidth="1" />
        <circle cx={250} cy={420} r="2.5" fill={INK} />
        <circle cx={330} cy={460} r="2.5" fill={INK} />
        <circle cx={280} cy={500} r="2.5" fill={INK} />
        <circle cx={200} cy={460} r="2.5" fill={INK} />
        <T x={245} y={412} s={7}>A</T>
        <T x={335} y={458} s={7}>B</T>
        <T x={282} y={514} s={7}>C</T>
      </g>
    </g>
  );
}

function VariantLimites() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit la fonction h définie sur ℝ* par:</T>
      <ItalicT x={160} y={132} s={12}>h(x) = x·sin(1/x)</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Montrer que pour tout x ∈ ℝ*, −1 ≤ sin(1/x) ≤ 1.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>En déduire, à l'aide du théorème des gendarmes, que lim h(x) = 0 quand x→+∞.</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>Étudier lim h(x) quand x→0. Que peut-on dire ?</T></Q>

      <GraphAxes x={150} y={280} w={300} h={240} />
      <path d="M 170 400 Q 200 380 220 400 Q 240 420 260 400 Q 280 385 300 400 Q 320 410 340 400 Q 360 395 380 400 Q 400 402 450 400" stroke={BLUE} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function VariantExpFunct() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit la fonction φ définie sur ℝ par:</T>
      <ItalicT x={140} y={132} s={12}>φ(x) = e^(−x²)</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Étudier la parité de φ.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Calculer les limites de φ en ±∞. Interpréter géométriquement.</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>Montrer que φ'(x) = −2x·e^(−x²). Dresser le tableau de variations.</T></Q>

      <GraphAxes x={150} y={280} w={300} h={240} />
      <path d="M 170 520 Q 250 520 300 340 Q 350 520 450 520" stroke={BLUE} strokeWidth="1.2" fill="none" />
      <T x={300} y={330} s={7}>1</T>
    </g>
  );
}

function VariantTrigono() {
  return (
    <g>
      <T x={40} y={110} s={9}>Résoudre dans [0, 2π] les équations suivantes:</T>

      <Q x={40} y={140} n="1."><ItalicT x={60} y={140} s={11}>cos(2x) = 1/2</ItalicT></Q>
      <Q x={40} y={170} n="2."><ItalicT x={60} y={170} s={11}>sin(3x) = √2/2</ItalicT></Q>
      <Q x={40} y={200} n="3."><ItalicT x={60} y={200} s={11}>2cos²(x) − cos(x) − 1 = 0</ItalicT></Q>
      <Q x={40} y={230} n="4."><T x={60} y={230}>Résoudre cos(x) ≤ sin(x) sur [0, 2π].</T></Q>

      {/* unit circle */}
      <g stroke={INK} strokeWidth="0.7" fill="none" opacity="0.7">
        <circle cx={300} cy={440} r={90} />
        <line x1={200} y1={440} x2={400} y2={440} />
        <line x1={300} y1={350} x2={300} y2={530} />
        <line x1={300} y1={440} x2={360} y2={380} stroke={BLUE} strokeWidth="1.2" />
        <path d="M 300 440 L 360 440 A 90 90 0 0 0 360 380" fill={BLUE} fillOpacity="0.1" />
        <circle cx={360} cy={380} r="2.5" fill={INK} />
        <T x={365} y={375} s={7}>M</T>
        <T x={295} y={435} s={7}>O</T>
      </g>
    </g>
  );
}

function VariantRecurrence() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit (w_n) la suite définie par w₀ = 2 et:</T>
      <ItalicT x={150} y={132} s={12}>w_(n+1) = √(3·w_n + 4)</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Calculer w₁, w₂, w₃. Conjecturer le comportement de la suite.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Montrer par récurrence que 0 ≤ w_n ≤ 4 pour tout n.</T></Q>
      <Q x={40} y={218} n="3.">
        <T x={60} y={218}>Initialisation: vérifier pour n = 0.</T>
      </Q>
      <Q x={40} y={246} n="4.">
        <T x={60} y={246}>Hérédité: supposer 0 ≤ w_n ≤ 4, montrer 0 ≤ w_(n+1) ≤ 4.</T>
      </Q>
      <Q x={40} y={274} n="5."><T x={60} y={274}>Montrer que (w_n) est croissante. Que peut-on en déduire ?</T></Q>

      <GraphAxesSimple x={180} y={360} w={240} h={200} />
      {[
        [200, 540], [230, 490], [260, 460], [290, 445], [320, 438], [350, 435], [380, 433], [410, 432],
      ].map(([px, py], i) => (
        <g key={i}>
          <circle cx={px} cy={py} r="2.5" fill={BLUE} />
          {i > 0 && <line x1={[200, 230, 260, 290, 320, 350, 380][i - 1]} y1={[540, 490, 460, 445, 438, 435, 433][i - 1]} x2={px} y2={py} stroke={BLUE} strokeWidth="0.8" opacity="0.5" />}
        </g>
      ))}
    </g>
  );
}

function VariantGeneralites() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit la fonction k définie par:</T>
      <ItalicT x={150} y={132} s={12}>k(x) = x⁴ − 2x²</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Déterminer le domaine de définition de k.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Étudier la parité de k.</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>La fonction k est-elle périodique ? Justifier.</T></Q>
      <Q x={40} y={246} n="4."><T x={60} y={246}>Étudier les variations de k sur [0, +∞[.</T></Q>

      <GraphAxes x={150} y={300} w={300} h={240} />
      <path d="M 170 520 Q 250 520 300 380 Q 350 520 450 520" stroke={BLUE} strokeWidth="1.2" fill="none" />
    </g>
  );
}

function VariantBarycentre() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soient les points A, B, C du plan. On considère le point G barycentre de:</T>
      <ItalicT x={120} y={132} s={11}>(A, 2) ; (B, 3) ; (C, 1)</ItalicT>

      <Q x={40} y={162} n="1."><T x={60} y={162}>Justifier l'existence du barycentre G.</T></Q>
      <Q x={40} y={190} n="2."><T x={60} y={190}>Exprimer le vecteur OG en fonction des vecteurs OA, OB, OC.</T></Q>
      <Q x={40} y={218} n="3."><T x={60} y={218}>Montrer que G appartient au segment [AB] dans un cas particulier.</T></Q>

      <g stroke={INK} strokeWidth="0.8" fill="none" opacity="0.7">
        <polygon points="200,400 380,380 280,520" />
        <circle cx={200} cy={400} r="3" fill={INK} />
        <circle cx={380} cy={380} r="3" fill={INK} />
        <circle cx={280} cy={520} r="3" fill={INK} />
        <circle cx={275} cy={423} r="3.5" fill={RED} />
        <T x={190} y={394} s={8}>A</T>
        <T x={385} y={376} s={8}>B</T>
        <T x={275} y={534} s={8}>C</T>
        <T x={282} y={420} s={8} fill={RED}>G</T>
      </g>
    </g>
  );
}

function VariantExpCroissance() {
  return (
    <g>
      <T x={40} y={110} s={9}>Une population de bactéries évolue selon le modèle:</T>
      <ItalicT x={140} y={132} s={12}>P(t) = P₀·e^(0.05t)</ItalicT>
      <T x={40} y={152} s={9}>où t est exprimé en heures et P₀ = 1000.</T>

      <Q x={40} y={180} n="1."><T x={60} y={180}>Calculer P(10), P(24).</T></Q>
      <Q x={40} y={208} n="2."><T x={60} y={208}>Au bout de combien de temps la population double-t-elle ?</T></Q>
      <Q x={40} y={236} n="3."><T x={60} y={236}>Étudier la croissance de P. Interpréter.</T></Q>

      <GraphAxes x={150} y={280} w={300} h={240} />
      <path d="M 170 520 Q 300 518 360 480 Q 400 440 450 360" stroke={BLUE} strokeWidth="1.2" fill="none" />
      <T x={455} y={360} s={7}>P(t)</T>
    </g>
  );
}

function VariantVariablesAleatoires() {
  return (
    <g>
      <T x={40} y={110} s={9}>Soit X une variable aléatoire de loi de probabilité:</T>
      <g stroke={INK} strokeWidth="0.6" opacity="0.7">
        <line x1={120} y1={140} x2={460} y2={140} />
        <line x1={120} y1={170} x2={460} y2={170} />
        <line x1={120} y1={140} x2={120} y2={170} />
        <line x1={200} y1={140} x2={200} y2={170} />
        <line x1={280} y1={140} x2={280} y2={170} />
        <line x1={360} y1={140} x2={360} y2={170} />
        <line x1={460} y1={140} x2={460} y2={170} />
      </g>
      <ItalicT x={130} y={160} s={9}>x_i</ItalicT>
      <ItalicT x={225} y={160} s={8}>−2</ItalicT>
      <ItalicT x={305} y={160} s={8}>0</ItalicT>
      <ItalicT x={385} y={160} s={8}>1</ItalicT>
      <ItalicT x={430} y={160} s={8}>3</ItalicT>
      <ItalicT x={225} y={158} s={8}>0.2</ItalicT>

      <Q x={40} y={200} n="1."><T x={60} y={200}>Compléter la loi de probabilité sachant que P(X=3) = 0.3.</T></Q>
      <Q x={40} y={228} n="2."><T x={60} y={228}>Calculer l'espérance E(X) et la variance V(X).</T></Q>
      <Q x={40} y={256} n="3."><T x={60} y={256}>Définir Y = 2X − 1. Calculer E(Y) et V(Y).</T></Q>
    </g>
  );
}

export default ExercisePageSVG;
