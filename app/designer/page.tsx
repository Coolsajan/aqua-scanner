"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import "../globals.css";

// ── Types ──────────────────────────────────────────────────────────────────
interface TankForm {
  length: string; width: string; height: string; unit: "cm" | "inch";
  shape: string; ecosystem: string; style: string;
  fishWanted: string; fishCount: string; hasCenterpiece: string;
  wantsPlants: string; wantsHardscape: string;
  filtration: string; co2: string; lighting: string; lightingBudget: string;
  experience: string; budget: string; maintenanceTime: string;
  buildMode: "existing" | "new";
  propsDescription: string;
}

interface DesignIdea {
  title: string;
  tagline: string;
  theme: string;
  difficulty: string;
  budgetMatch: string;
  stockingList: { name: string; qty: string; role: string }[];
  plantList: { name: string; zone: string; qty: string }[];
  hardscape: string[];
  filtrationRec: string;
  lightingRec: string;
  co2Rec: string;
  waterParams: { ph: string; temp: string; hardness: string };
  substrate: string;
  layoutDescription: string;
  topDownLayout: string[][];
  maintenanceSchedule: { frequency: string; tasks: string[] }[];
  setupTimeline: { week: string; task: string }[];
  pros: string[];
  cons: string[];
  estimatedCost: string;
  compatibilityNotes: string;
}

// ── Constants ──────────────────────────────────────────────────────────────
const SHAPES = ["Rectangular","Cube","Bow-front","Hexagonal","L-shape","Corner/Pentagon"];
const ECOSYSTEMS = ["Freshwater Community","Planted (Nature/Dutch)","Biotope","Cichlid","Predator","Brackish","Nano","Paludarium","Iwagumi"];
const STYLES = ["Natural / Wabi-Kusa","Jungle / Overgrown","Minimalist / Zen","Amazon Biotope","African Rift Lake","Asian Mountain Stream","Dutch Garden","Blackwater Tannin","Iwagumi Stone","Reef-inspired Freshwater"];
const FILTRATIONS = ["Canister Filter","Hang-On-Back (HOB)","Sponge Filter","Sump / Wet-Dry","Internal Filter","Undergravel","Fluidized Bed"];
const CO2_OPTS = ["Pressurized CO₂ System","DIY Yeast CO₂","No CO₂ / Natural","Not Sure Yet"];
const LIGHTING_TYPES = ["Full Spectrum LED","Planted Tank LED (high PAR)","T5 Fluorescent","Metal Halide","Clip-on/Basic LED","Natural Sunlight Only"];
const LIGHTING_BUDGETS = ["Budget (<$50)","Mid-range ($50–150)","Premium ($150–300)","No limit"];
const EXPERIENCE_LEVELS = ["Complete Beginner","Hobbyist (1–2 years)","Intermediate (3–5 years)","Advanced / Experienced"];
const BUDGETS = ["Tight (<$150 total)","Budget ($150–350)","Mid ($350–700)","Comfortable ($700–1500)","No limit"];
const MAINTENANCE_TIMES = ["Minimal (30min/week)","Moderate (1–2hr/week)","Dedicated (daily ok)"];

const DEFAULT_FORM: TankForm = {
  length:"","width":"","height":"",unit:"cm",
  shape:"Rectangular",ecosystem:"Freshwater Community",style:"Natural / Wabi-Kusa",
  fishWanted:"",fishCount:"",hasCenterpiece:"",
  wantsPlants:"yes",wantsHardscape:"both",
  filtration:"Canister Filter",co2:"No CO₂ / Natural",lighting:"Full Spectrum LED",lightingBudget:"Mid-range ($50–150)",
  experience:"Hobbyist (1–2 years)",budget:"Mid ($350–700)",maintenanceTime:"Moderate (1–2hr/week)",
  buildMode:"new",propsDescription:"",
};

// ── Layout Cell Colors ─────────────────────────────────────────────────────
const CELL_COLORS: Record<string, string> = {
  "🌿":"#06d6a0","🪨":"#8ecfdc","🪵":"#c4a35a","🐟":"#48cae4",
  "🌱":"#52b788","🏔️":"#94a3b8","💧":"#0e7490","⬜":"#0a1e2e",
  "🌾":"#84cc16","🔴":"#ef4444","🟡":"#eab308",
};

// ── Helper: volume ─────────────────────────────────────────────────────────
function calcVolume(f: TankForm) {
  const l = parseFloat(f.length), w = parseFloat(f.width), h = parseFloat(f.height);
  if (isNaN(l)||isNaN(w)||isNaN(h)) return null;
  const vol = f.unit === "cm" ? (l*w*h)/1000 : l*w*h*0.00328;
  return Math.round(vol);
}

// ── NavBar ─────────────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav className="nav">
      <a className="nav-logo" href="/">
        <span className="nav-logo-icon">🐠</span>
        <span className="nav-logo-text">AquaScan</span>
      </a>
      <div className="nav-tabs">
        <Link href="/" className="nav-tab">🔬 <span className="tab-label">Scanner</span></Link>
        <Link href="/designer" className="nav-tab active">🎨 <span className="tab-label">Tank Designer</span></Link>
      </div>
    </nav>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function DesignerPage() {
  const [form, setForm] = useState<TankForm>(DEFAULT_FORM);
  const [propImages, setPropImages] = useState<{name:string;base64:string;mime:string}[]>([]);
  const [designs, setDesigns] = useState<DesignIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [activeDesign, setActiveDesign] = useState(0);
  const [step, setStep] = useState<"form"|"results">("form");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof TankForm, v: string) => setForm(p => ({...p,[k]:v}));
  const volume = calcVolume(form);

  const handlePropImage = useCallback((files: FileList) => {
    Array.from(files).slice(0,4).forEach(f => {
      if (!f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = e => {
        const b64 = (e.target?.result as string).split(",")[1];
        setPropImages(p => [...p.slice(0,3), {name:f.name,base64:b64,mime:f.type}]);
      };
      r.readAsDataURL(f);
    });
  },[]);

  const handleGenerate = async () => {
    if (!form.length||!form.width||!form.height) { setError("Please enter tank dimensions."); return; }
    setLoading(true); setError(null); setDesigns([]);
    try {
      const res = await fetch("/api/design", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({form, propImages, volume}),
      });
      if (!res.ok) throw new Error("Design generation failed.");
      const data = await res.json();
      setDesigns(data.designs || []);
      setStep("results");
      setActiveDesign(0);
    } catch(e:unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .des-page { max-width: 900px; margin: 0 auto; padding: 44px 20px 100px; }
        .des-hero { text-align: center; margin-bottom: 44px; }
        .des-title { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg,#00b4d8,#06d6a0); -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text; letter-spacing:-1px; margin-bottom:10px; }
        .des-sub { color: #5e9aaa; font-size: 0.95rem; line-height: 1.6; }

        /* Form sections */
        .form-section { background: rgba(255,255,255,0.025); border: 1px solid rgba(0,180,216,0.15); border-radius: 20px; padding: 24px 26px; margin-bottom: 20px; }
        .form-section-title { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #00b4d8; font-family: var(--font-mono); margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .form-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(160px,1fr)); gap: 14px; margin-bottom: 14px; }
        .form-row:last-child { margin-bottom: 0; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; color: #3d7080; font-family: var(--font-mono); font-weight: 700; }
        .form-input { background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; color: #e8f4f0; font-family: var(--font-display); font-size: 0.9rem; padding: 10px 14px; transition: border-color 0.2s; outline: none; width: 100%; }
        .form-input:focus { border-color: rgba(0,180,216,0.5); background: rgba(0,180,216,0.06); }
        .form-input option { background: #071520; }
        .dim-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end; }
        .unit-toggle { display: flex; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; height: 42px; }
        .unit-btn { flex: 1; background: transparent; border: none; color: #5e9aaa; font-family: var(--font-mono); font-size: 0.8rem; font-weight: 700; cursor: pointer; padding: 0 12px; transition: all 0.2s; }
        .unit-btn.act { background: rgba(0,180,216,0.2); color: #00e5ff; }

        /* Chip selector */
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 7px 14px; cursor: pointer; font-size: 0.8rem; font-weight: 600; color: #5e9aaa; transition: all 0.2s; white-space: nowrap; }
        .chip:hover { border-color: rgba(0,180,216,0.4); color: #c2e4ed; }
        .chip.act { background: rgba(0,180,216,0.15); border-color: #00b4d8; color: #00e5ff; }

        /* Build mode toggle */
        .build-mode { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mode-card { background: rgba(255,255,255,0.03); border: 2px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 18px; cursor: pointer; transition: all 0.2s; text-align: center; }
        .mode-card:hover { border-color: rgba(0,180,216,0.35); background: rgba(0,180,216,0.06); }
        .mode-card.act { border-color: #00b4d8; background: rgba(0,180,216,0.12); }
        .mode-ico { font-size: 2rem; margin-bottom: 8px; }
        .mode-title { font-size: 0.88rem; font-weight: 700; color: #c2e4ed; margin-bottom: 4px; }
        .mode-desc { font-size: 0.75rem; color: #4e8a9a; line-height: 1.4; }

        /* Prop upload */
        .prop-drop { border: 2px dashed rgba(0,180,216,0.25); border-radius: 14px; padding: 28px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(0,180,216,0.03); }
        .prop-drop:hover { border-color: #00b4d8; background: rgba(0,180,216,0.07); }
        .prop-imgs { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .prop-img-box { position: relative; width: 80px; height: 80px; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(0,180,216,0.25); }
        .prop-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .prop-remove { position: absolute; top: 3px; right: 3px; background: rgba(255,77,109,0.85); border: none; border-radius: 50%; width: 18px; height: 18px; cursor: pointer; color: white; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; }

        /* Volume badge */
        .vol-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,180,216,0.12); border: 1px solid rgba(0,180,216,0.3); border-radius: 20px; padding: 6px 16px; font-size: 0.82rem; font-weight: 700; color: #00e5ff; font-family: var(--font-mono); margin-top: 8px; }

        /* Generate btn */
        .gen-wrap { text-align: center; margin-top: 28px; }
        .gen-btn { background: linear-gradient(135deg,#00b4d8,#06d6a0); border: none; border-radius: 14px; color: #040d14; font-family: var(--font-display); font-weight: 800; font-size: 1.1rem; padding: 18px 48px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 10px; }
        .gen-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,180,216,0.3); }
        .gen-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        /* Loading state */
        .loading-state { text-align: center; padding: 60px 20px; }
        .loading-fish { font-size: 3rem; animation: swim 2s ease-in-out infinite; display: block; margin-bottom: 20px; }
        @keyframes swim { 0%,100%{transform:translateX(-10px)} 50%{transform:translateX(10px)} }
        .loading-title { font-size: 1.2rem; font-weight: 700; color: #c2e4ed; margin-bottom: 8px; }
        .loading-sub { color: #4e8a9a; font-size: 0.88rem; font-family: var(--font-mono); }

        /* Results */
        .results-header { margin-bottom: 28px; }
        .results-title { font-size: 1.5rem; font-weight: 800; color: #e8f4f0; margin-bottom: 6px; }
        .results-sub { color: #5e9aaa; font-size: 0.88rem; }
        .design-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 24px; }
        .design-tab { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 18px; cursor: pointer; white-space: nowrap; transition: all 0.2s; min-width: 160px; text-align: left; }
        .design-tab:hover { border-color: rgba(0,180,216,0.35); }
        .design-tab.act { background: rgba(0,180,216,0.14); border-color: #00b4d8; }
        .design-tab-num { font-size: 0.65rem; font-family: var(--font-mono); color: #3d7080; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .design-tab-name { font-size: 0.88rem; font-weight: 700; color: #c2e4ed; margin-bottom: 2px; }
        .design-tab-diff { font-size: 0.72rem; color: #4e8a9a; }

        /* Design detail card */
        .detail-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(0,180,216,0.18); border-radius: 20px; overflow: hidden; animation: fadeUp 0.35s ease; }
        .detail-hero { padding: 26px 28px 22px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .detail-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
        .detail-title { font-size: 1.65rem; font-weight: 800; color: #e8f4f0; letter-spacing: -0.5px; }
        .detail-tagline { color: #7ab8c5; font-size: 0.9rem; margin-top: 4px; }
        .badge-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; font-family: var(--font-mono); }
        .badge-diff { background: rgba(255,209,102,0.12); border: 1px solid rgba(255,209,102,0.3); color: #ffd166; }
        .badge-budget { background: rgba(6,214,160,0.1); border: 1px solid rgba(6,214,160,0.25); color: #06d6a0; }
        .badge-cost { background: rgba(0,180,216,0.1); border: 1px solid rgba(0,180,216,0.25); color: #00e5ff; }

        /* Two-column layout for diagram + info */
        .detail-main { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
        .detail-left { padding: 22px 22px 22px 28px; border-right: 1px solid rgba(255,255,255,0.06); }
        .detail-right { padding: 22px 28px 22px 22px; }

        /* Top-down layout grid */
        .td-layout { font-family: var(--font-mono); font-size: 0.9rem; line-height: 1.2; }
        .td-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #00b4d8; font-weight: 700; margin-bottom: 10px; }
        .td-grid { display: inline-grid; gap: 2px; border: 1.5px solid rgba(0,180,216,0.25); border-radius: 10px; overflow: hidden; background: rgba(0,180,216,0.06); padding: 6px; width: 100%; }
        .td-row { display: flex; gap: 2px; justify-content: center; }
        .td-cell { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; border-radius: 4px; flex-shrink: 0; }

        /* Legend */
        .legend { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; color: #5e9aaa; font-family: var(--font-mono); }

        /* Stocking & plant tables */
        .item-list { display: flex; flex-direction: column; gap: 7px; }
        .item-row { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; gap: 12px; }
        .item-qty { background: rgba(0,180,216,0.15); color: #00e5ff; font-family: var(--font-mono); font-size: 0.78rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0; }
        .item-name { font-size: 0.88rem; font-weight: 600; color: #c2e4ed; flex: 1; }
        .item-role { font-size: 0.75rem; color: #4e8a9a; font-style: italic; }
        .zone-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 6px; font-family: var(--font-mono); font-weight: 600; flex-shrink: 0; }
        .zone-fg { background: rgba(6,214,160,0.15); color: #06d6a0; }
        .zone-mg { background: rgba(0,180,216,0.15); color: #00b4d8; }
        .zone-bg { background: rgba(72,202,228,0.15); color: #48cae4; }
        .zone-float { background: rgba(255,209,102,0.15); color: #ffd166; }

        /* Equipment section */
        .equip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .equip-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 14px; }
        .equip-lbl { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 1.5px; color: #3d7080; font-family: var(--font-mono); margin-bottom: 4px; }
        .equip-val { font-size: 0.85rem; font-weight: 600; color: #b0d4df; line-height: 1.4; }

        /* Timeline */
        .timeline { display: flex; flex-direction: column; gap: 0; }
        .tl-item { display: flex; gap: 16px; }
        .tl-left { display: flex; flex-direction: column; align-items: center; }
        .tl-dot { width: 10px; height: 10px; border-radius: 50%; background: #00b4d8; flex-shrink: 0; margin-top: 4px; }
        .tl-line { width: 2px; flex: 1; background: rgba(0,180,216,0.2); margin: 4px 0; min-height: 20px; }
        .tl-item:last-child .tl-line { display: none; }
        .tl-week { font-size: 0.68rem; color: #00b4d8; font-family: var(--font-mono); font-weight: 700; margin-bottom: 3px; }
        .tl-task { font-size: 0.83rem; color: #9ec8d4; line-height: 1.5; margin-bottom: 14px; }

        /* Pros/cons */
        .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .pros-box { background: rgba(6,214,160,0.07); border: 1px solid rgba(6,214,160,0.2); border-radius: 12px; padding: 14px; }
        .cons-box { background: rgba(255,140,66,0.07); border: 1px solid rgba(255,140,66,0.2); border-radius: 12px; padding: 14px; }
        .pc-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; font-family: var(--font-mono); margin-bottom: 10px; }
        .pros-box .pc-title { color: #06d6a0; }
        .cons-box .pc-title { color: #ff8c42; }
        .pc-list { list-style: none; display: flex; flex-direction: column; gap: 7px; }
        .pc-list li { font-size: 0.83rem; color: #9ec8d4; line-height: 1.5; padding-left: 18px; position: relative; }
        .pros-box .pc-list li::before { content: "✓"; position: absolute; left: 0; color: #06d6a0; font-weight: 700; }
        .cons-box .pc-list li::before { content: "✗"; position: absolute; left: 0; color: #ff8c42; }

        /* Water params */
        .wparams { display: flex; gap: 10px; flex-wrap: wrap; }
        .wp { background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.2); border-radius: 10px; padding: 10px 16px; }
        .wp-k { display: block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 1.5px; color: #3d7080; margin-bottom: 3px; font-family: var(--font-mono); }
        .wp-v { font-size: 0.95rem; font-weight: 700; color: #00e5ff; }

        /* Section within detail */
        .dsec { padding: 18px 28px; border-top: 1px solid rgba(255,255,255,0.06); }
        .dsec-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 2px; color: #00b4d8; font-weight: 700; font-family: var(--font-mono); margin-bottom: 14px; }

        .back-btn { background: none; border: none; color: #5e9aaa; cursor: pointer; font-family: var(--font-display); font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 20px; transition: color 0.2s; }
        .back-btn:hover { color: #00e5ff; }

        @media(max-width:700px){
          .detail-main{grid-template-columns:1fr}
          .detail-left{border-right:none;border-bottom:1px solid rgba(255,255,255,0.06);padding:18px}
          .detail-right{padding:18px}
          .pros-cons{grid-template-columns:1fr}
          .equip-grid{grid-template-columns:1fr}
          .dim-row{grid-template-columns:1fr 1fr;row-gap:10px}
          .build-mode{grid-template-columns:1fr}
        }
      `}</style>

      <NavBar />
      <div className="orbs">
        <div className="orb" style={{width:500,height:500,background:"#06d6a0",top:-200,right:-150}}/>
        <div className="orb" style={{width:400,height:400,background:"#00b4d8",bottom:-100,left:-100}}/>
        <div className="orb" style={{width:300,height:300,background:"#0077b6",top:"40%",left:"55%"}}/>
      </div>

      <div className="page">
        <div className="des-page">
          {step === "results" ? (
            /* ── RESULTS VIEW ── */
            <>
              <button className="back-btn" onClick={() => setStep("form")}>← Back to Form</button>
              <div className="results-header">
                <div className="results-title">🎨 Your Tank Design Ideas</div>
                <div className="results-sub">Here are 4 curated aquascape concepts for your {form.length}×{form.width}×{form.height}{form.unit} tank{volume ? ` (${volume}L)` : ""}</div>
              </div>
              <div className="design-tabs">
                {designs.map((d,i) => (
                  <button key={i} className={`design-tab${activeDesign===i?" act":""}`} onClick={() => setActiveDesign(i)}>
                    <div className="design-tab-num">Design 0{i+1}</div>
                    <div className="design-tab-name">{d.title}</div>
                    <div className="design-tab-diff">{d.difficulty}</div>
                  </button>
                ))}
              </div>
              {designs[activeDesign] && <DesignCard d={designs[activeDesign]} idx={activeDesign} />}
            </>
          ) : (
            /* ── FORM VIEW ── */
            <>
              <div className="des-hero">
                <div className="des-title">Tank Designer</div>
                <p className="des-sub">Fill in your tank details and get 4 personalized aquascape design ideas<br/>with full stocking lists, plant selections, and setup guides</p>
              </div>

              {/* DIMENSIONS */}
              <div className="form-section">
                <div className="form-section-title">📐 Tank Dimensions</div>
                <div className="dim-row">
                  <div className="form-group">
                    <label className="form-label">Length</label>
                    <input className="form-input" type="number" placeholder="e.g. 120" value={form.length} onChange={e=>set("length",e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Width</label>
                    <input className="form-input" type="number" placeholder="e.g. 45" value={form.width} onChange={e=>set("width",e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Height</label>
                    <input className="form-input" type="number" placeholder="e.g. 50" value={form.height} onChange={e=>set("height",e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <div className="unit-toggle">
                      <button className={`unit-btn${form.unit==="cm"?" act":""}`} onClick={()=>set("unit","cm")}>cm</button>
                      <button className={`unit-btn${form.unit==="inch"?" act":""}`} onClick={()=>set("unit","inch")}>in</button>
                    </div>
                  </div>
                </div>
                {volume && <div className="vol-badge">💧 Estimated Volume: ~{volume} liters</div>}
                <div className="form-row" style={{marginTop:16}}>
                  <div className="form-group">
                    <label className="form-label">Tank Shape</label>
                    <select className="form-input" value={form.shape} onChange={e=>set("shape",e.target.value)}>
                      {SHAPES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* ECOSYSTEM & STYLE */}
              <div className="form-section">
                <div className="form-section-title">🌊 Ecosystem & Style</div>
                <div className="form-group" style={{marginBottom:16}}>
                  <label className="form-label">Ecosystem Type</label>
                  <div className="chips">
                    {ECOSYSTEMS.map(e=><button key={e} className={`chip${form.ecosystem===e?" act":""}`} onClick={()=>set("ecosystem",e)}>{e}</button>)}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Aesthetic Style</label>
                  <div className="chips">
                    {STYLES.map(s=><button key={s} className={`chip${form.style===s?" act":""}`} onClick={()=>set("style",s)}>{s}</button>)}
                  </div>
                </div>
              </div>

              {/* LIVESTOCK */}
              <div className="form-section">
                <div className="form-section-title">🐠 Livestock</div>
                <div className="form-row">
                  <div className="form-group" style={{gridColumn:"span 2"}}>
                    <label className="form-label">Fish / Species You Want</label>
                    <input className="form-input" type="text" placeholder="e.g. neon tetras, corydoras, betta — or 'surprise me!'" value={form.fishWanted} onChange={e=>set("fishWanted",e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rough Fish Count</label>
                    <input className="form-input" type="text" placeholder="e.g. 20–30 small" value={form.fishCount} onChange={e=>set("fishCount",e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{marginTop:12}}>
                  <label className="form-label">Centerpiece Fish?</label>
                  <input className="form-input" type="text" placeholder="e.g. Discus, Angelfish, or 'no preference'" value={form.hasCenterpiece} onChange={e=>set("hasCenterpiece",e.target.value)} />
                </div>
                <div className="form-row" style={{marginTop:14}}>
                  <div className="form-group">
                    <label className="form-label">Live Plants?</label>
                    <select className="form-input" value={form.wantsPlants} onChange={e=>set("wantsPlants",e.target.value)}>
                      <option value="yes">Yes — planted tank</option>
                      <option value="low">Low-tech / easy plants</option>
                      <option value="no">No plants / artificial</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Hardscape</label>
                    <select className="form-input" value={form.wantsHardscape} onChange={e=>set("wantsHardscape",e.target.value)}>
                      <option value="both">Driftwood + Rocks</option>
                      <option value="driftwood">Driftwood only</option>
                      <option value="rocks">Rocks/Stones only</option>
                      <option value="none">No hardscape</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* EQUIPMENT */}
              <div className="form-section">
                <div className="form-section-title">🔧 Equipment</div>
                <div className="form-group" style={{marginBottom:14}}>
                  <label className="form-label">Filtration Type</label>
                  <div className="chips">
                    {FILTRATIONS.map(f=><button key={f} className={`chip${form.filtration===f?" act":""}`} onClick={()=>set("filtration",f)}>{f}</button>)}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:14}}>
                  <label className="form-label">CO₂ System</label>
                  <div className="chips">
                    {CO2_OPTS.map(c=><button key={c} className={`chip${form.co2===c?" act":""}`} onClick={()=>set("co2",c)}>{c}</button>)}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:14}}>
                  <label className="form-label">Lighting Type</label>
                  <div className="chips">
                    {LIGHTING_TYPES.map(l=><button key={l} className={`chip${form.lighting===l?" act":""}`} onClick={()=>set("lighting",l)}>{l}</button>)}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lighting Budget</label>
                  <div className="chips">
                    {LIGHTING_BUDGETS.map(l=><button key={l} className={`chip${form.lightingBudget===l?" act":""}`} onClick={()=>set("lightingBudget",l)}>{l}</button>)}
                  </div>
                </div>
              </div>

              {/* EXPERIENCE & BUDGET */}
              <div className="form-section">
                <div className="form-section-title">💰 Experience & Budget</div>
                <div className="form-group" style={{marginBottom:14}}>
                  <label className="form-label">Your Experience Level</label>
                  <div className="chips">
                    {EXPERIENCE_LEVELS.map(e=><button key={e} className={`chip${form.experience===e?" act":""}`} onClick={()=>set("experience",e)}>{e}</button>)}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:14}}>
                  <label className="form-label">Total Budget</label>
                  <div className="chips">
                    {BUDGETS.map(b=><button key={b} className={`chip${form.budget===b?" act":""}`} onClick={()=>set("budget",b)}>{b}</button>)}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Maintenance Time Available</label>
                  <div className="chips">
                    {MAINTENANCE_TIMES.map(m=><button key={m} className={`chip${form.maintenanceTime===m?" act":""}`} onClick={()=>set("maintenanceTime",m)}>{m}</button>)}
                  </div>
                </div>
              </div>

              {/* BUILD MODE */}
              <div className="form-section">
                <div className="form-section-title">🛠️ Build Approach</div>
                <div className="build-mode">
                  <div className={`mode-card${form.buildMode==="existing"?" act":""}`} onClick={()=>set("buildMode","existing")}>
                    <div className="mode-ico">🔄</div>
                    <div className="mode-title">Use Existing Props</div>
                    <div className="mode-desc">Upload photos of your filter, lights, hardscape or decor — AI designs around what you already have</div>
                  </div>
                  <div className={`mode-card${form.buildMode==="new"?" act":""}`} onClick={()=>set("buildMode","new")}>
                    <div className="mode-ico">✨</div>
                    <div className="mode-title">Generate Fresh Ideas</div>
                    <div className="mode-desc">Start from scratch — AI recommends the best equipment and setup within your budget</div>
                  </div>
                </div>

                {/* Optional prop images */}
                <div style={{marginTop:18}}>
                  <label className="form-label" style={{marginBottom:8,display:"block"}}>
                    {form.buildMode==="existing" ? "Upload Your Props / Equipment Photos (optional, up to 4)" : "Upload Inspiration / Reference Photos (optional)"}
                  </label>
                  <div className="prop-drop" onClick={()=>fileRef.current?.click()}>
                    <div style={{fontSize:"2rem",marginBottom:8}}>📎</div>
                    <div style={{fontSize:"0.85rem",color:"#5e9aaa"}}>Click to upload photos of your {form.buildMode==="existing"?"filter, lights, driftwood, rocks":"inspiration tanks"}</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>e.target.files && handlePropImage(e.target.files)} />
                  {propImages.length > 0 && (
                    <div className="prop-imgs">
                      {propImages.map((p,i)=>(
                        <div key={i} className="prop-img-box">
                          <img src={`data:${p.mime};base64,${p.base64}`} alt={p.name} />
                          <button className="prop-remove" onClick={()=>setPropImages(prev=>prev.filter((_,j)=>j!==i))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional extra description */}
                <div style={{marginTop:16}}>
                  <label className="form-label" style={{marginBottom:8,display:"block"}}>Any other notes? (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="e.g. I already have spider wood, want a blackwater feel, no aggressive fish..." value={form.propsDescription} onChange={e=>set("propsDescription",e.target.value)} style={{resize:"vertical"}} />
                </div>
              </div>

              {error && <div className="err-box" style={{marginBottom:16}}>⚠️ {error}</div>}

              <div className="gen-wrap">
                <button className="gen-btn" onClick={handleGenerate} disabled={loading}>
                  {loading ? <><span className="spin"/>&nbsp;Generating...</> : <>🎨 Generate 4 Design Ideas</>}
                </button>
              </div>

              {loading && (
                <div className="loading-state">
                  <span className="loading-fish">🐠</span>
                  <div className="loading-title">Crafting your perfect aquascape...</div>
                  <div className="loading-sub">Analyzing dimensions · Matching livestock · Designing layouts</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Design Card Component ──────────────────────────────────────────────────
function DesignCard({ d, idx }: { d: DesignIdea; idx: number }) {
  const zoneClass: Record<string,string> = {
    "foreground":"zone-fg","midground":"zone-mg","background":"zone-bg","floating":"zone-float",
    "fg":"zone-fg","mg":"zone-mg","bg":"zone-bg",
  };

  return (
    <div className="detail-card">
      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-top">
          <div>
            <div style={{fontSize:"0.7rem",fontFamily:"var(--font-mono)",color:"#3d7080",textTransform:"uppercase",letterSpacing:"2px",marginBottom:5}}>Design 0{idx+1} · {d.theme}</div>
            <div className="detail-title">{d.title}</div>
            <div className="detail-tagline">{d.tagline}</div>
          </div>
          <div className="badge-row">
            <span className="badge badge-diff">🎯 {d.difficulty}</span>
            <span className="badge badge-budget">💰 {d.budgetMatch}</span>
            {d.estimatedCost && <span className="badge badge-cost">~{d.estimatedCost}</span>}
          </div>
        </div>
      </div>

      {/* Main 2-col: Top-down layout + Overview */}
      <div className="detail-main">
        <div className="detail-left">
          <div className="td-title">Top-Down Layout View</div>
          {d.topDownLayout && d.topDownLayout.length > 0 ? (
            <>
              <div className="td-grid" style={{gridTemplateRows:`repeat(${d.topDownLayout.length},28px)`}}>
                {d.topDownLayout.map((row,ri)=>(
                  <div key={ri} className="td-row">
                    {row.map((cell,ci)=>(
                      <div key={ci} className="td-cell" style={{background:CELL_COLORS[cell]||"rgba(0,180,216,0.08)"}} title={cell}>
                        {cell}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="legend">
                {Array.from(new Set(d.topDownLayout.flat())).map(c=>(
                  <div key={c} className="legend-item">
                    <span style={{width:14,height:14,borderRadius:3,background:CELL_COLORS[c]||"#0a1e2e",display:"inline-block",flexShrink:0}}/>
                    {c === "🌿" ? "Plants" : c === "🪨" ? "Rock/Stone" : c === "🪵" ? "Driftwood" : c === "🐟" ? "Open swim" : c === "🌱" ? "Carpet" : c === "💧" ? "Open water" : c === "🏔️" ? "Mountain stone" : c === "⬜" ? "Sand/Open" : c === "🌾" ? "Grass/Stem" : c}
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{color:"#3d7080",fontSize:"0.85rem"}}>Layout not available</div>}

          {/* Water params */}
          {d.waterParams && (
            <div style={{marginTop:20}}>
              <div className="td-title" style={{marginBottom:10}}>💧 Water Parameters</div>
              <div className="wparams">
                <div className="wp"><span className="wp-k">pH</span><span className="wp-v">{d.waterParams.ph}</span></div>
                <div className="wp"><span className="wp-k">Temperature</span><span className="wp-v">{d.waterParams.temp}</span></div>
                <div className="wp"><span className="wp-k">Hardness</span><span className="wp-v">{d.waterParams.hardness}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="detail-right">
          {/* Stocking list */}
          {d.stockingList && d.stockingList.length > 0 && (
            <div style={{marginBottom:20}}>
              <div className="td-title">🐟 Stocking List</div>
              <div className="item-list">
                {d.stockingList.map((f,i)=>(
                  <div key={i} className="item-row">
                    <span className="item-qty">×{f.qty}</span>
                    <div style={{flex:1}}><div className="item-name">{f.name}</div><div className="item-role">{f.role}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plant list */}
          {d.plantList && d.plantList.length > 0 && (
            <div>
              <div className="td-title">🌿 Plant List</div>
              <div className="item-list">
                {d.plantList.map((p,i)=>(
                  <div key={i} className="item-row">
                    <span className={`zone-badge ${zoneClass[p.zone.toLowerCase()]||"zone-mg"}`}>{p.zone}</span>
                    <div style={{flex:1}}><div className="item-name">{p.name}</div></div>
                    <span className="item-qty">×{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Layout description */}
      {d.layoutDescription && (
        <div className="dsec">
          <div className="dsec-title">🎨 Design Vision</div>
          <p style={{color:"#9ec8d4",fontSize:"0.9rem",lineHeight:1.7}}>{d.layoutDescription}</p>
        </div>
      )}

      {/* Equipment */}
      <div className="dsec">
        <div className="dsec-title">🔧 Equipment Recommendations</div>
        <div className="equip-grid">
          <div className="equip-item"><div className="equip-lbl">Filtration</div><div className="equip-val">{d.filtrationRec}</div></div>
          <div className="equip-item"><div className="equip-lbl">Lighting</div><div className="equip-val">{d.lightingRec}</div></div>
          <div className="equip-item"><div className="equip-lbl">CO₂</div><div className="equip-val">{d.co2Rec}</div></div>
          <div className="equip-item"><div className="equip-lbl">Substrate</div><div className="equip-val">{d.substrate}</div></div>
        </div>
      </div>

      {/* Hardscape */}
      {d.hardscape && d.hardscape.length > 0 && (
        <div className="dsec">
          <div className="dsec-title">🪵 Hardscape & Decor</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {d.hardscape.map((h,i)=>(
              <span key={i} style={{background:"rgba(196,163,90,0.12)",border:"1px solid rgba(196,163,90,0.25)",borderRadius:20,padding:"5px 12px",fontSize:"0.8rem",color:"#c4a35a",fontWeight:600}}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Setup Timeline */}
      {d.setupTimeline && d.setupTimeline.length > 0 && (
        <div className="dsec">
          <div className="dsec-title">📅 Setup Timeline</div>
          <div className="timeline">
            {d.setupTimeline.map((t,i)=>(
              <div key={i} className="tl-item">
                <div className="tl-left"><div className="tl-dot"/><div className="tl-line"/></div>
                <div><div className="tl-week">{t.week}</div><div className="tl-task">{t.task}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compatibility */}
      {d.compatibilityNotes && (
        <div className="dsec">
          <div className="dsec-title">⚠️ Compatibility Notes</div>
          <p style={{color:"#9ec8d4",fontSize:"0.88rem",lineHeight:1.6}}>{d.compatibilityNotes}</p>
        </div>
      )}

      {/* Pros / Cons */}
      {(d.pros?.length > 0 || d.cons?.length > 0) && (
        <div className="dsec">
          <div className="dsec-title">⚖️ Pros & Cons</div>
          <div className="pros-cons">
            <div className="pros-box"><div className="pc-title">Pros</div><ul className="pc-list">{d.pros?.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            <div className="cons-box"><div className="pc-title">Cons</div><ul className="pc-list">{d.cons?.map((c,i)=><li key={i}>{c}</li>)}</ul></div>
          </div>
        </div>
      )}

      {/* Maintenance */}
      {d.maintenanceSchedule && d.maintenanceSchedule.length > 0 && (
        <div className="dsec" style={{paddingBottom:26}}>
          <div className="dsec-title">🗓️ Maintenance Schedule</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {d.maintenanceSchedule.map((m,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 16px"}}>
                <div style={{fontSize:"0.7rem",fontFamily:"var(--font-mono)",textTransform:"uppercase",letterSpacing:"1.5px",color:"#00b4d8",fontWeight:700,marginBottom:6}}>{m.frequency}</div>
                <ul style={{listStyle:"none",display:"flex",flexDirection:"column",gap:5}}>
                  {m.tasks.map((t,j)=><li key={j} style={{fontSize:"0.84rem",color:"#9ec8d4",paddingLeft:16,position:"relative"}}><span style={{position:"absolute",left:0,color:"#06d6a0"}}>·</span>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
