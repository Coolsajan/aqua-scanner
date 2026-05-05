"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AuthButton from "../components/AuthButton";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import "../globals.css";

interface TankForm {
  length:string;width:string;height:string;unit:"cm"|"inch";
  shape:string;ecosystem:string;style:string;
  fishWanted:string;fishCount:string;hasCenterpiece:string;
  wantsPlants:string;wantsHardscape:string;
  filtration:string;co2:string;lighting:string;lightingBudget:string;
  experience:string;budget:string;maintenanceTime:string;
  buildMode:"existing"|"new";propsDescription:string;
}
interface DesignIdea {
  title:string;tagline:string;theme:string;difficulty:string;budgetMatch:string;estimatedCost:string;
  imagePrompt:string;
  imagePromptTopDown?:string;
  stockingList:{name:string;qty:string;role:string}[];
  plantList:{name:string;zone:string;qty:string}[];
  hardscape:string[];
  filtrationRec:string;lightingRec:string;co2Rec:string;substrate:string;
  waterParams:{ph:string;temp:string;hardness:string};
  layoutDescription:string;
  topDownLayout:string[][];
  maintenanceSchedule:{frequency:string;tasks:string[]}[];
  setupTimeline:{week:string;task:string}[];
  pros:string[];cons:string[];compatibilityNotes:string;
}

const SHAPES=["Rectangular","Cube","Bow-front","Hexagonal","L-shape","Corner/Pentagon"];
const ECOSYSTEMS=["Freshwater Community","Planted (Nature/Dutch)","Biotope","Cichlid","Predator","Brackish","Nano","Paludarium","Iwagumi"];
const STYLES=["Natural / Wabi-Kusa","Jungle / Overgrown","Minimalist / Zen","Amazon Biotope","African Rift Lake","Asian Mountain Stream","Dutch Garden","Blackwater Tannin","Iwagumi Stone","Reef-inspired Freshwater"];
const FILTRATIONS=["Canister Filter","Hang-On-Back (HOB)","Sponge Filter","Sump / Wet-Dry","Internal Filter","Undergravel"];
const CO2_OPTS=["Pressurized CO₂ System","DIY Yeast CO₂","No CO₂ / Natural","Not Sure Yet"];
const LIGHTING_TYPES=["Full Spectrum LED","Planted Tank LED (high PAR)","T5 Fluorescent","Metal Halide","Basic LED"];
const LIGHTING_BUDGETS=["Budget (<$50)","Mid-range ($50–150)","Premium ($150–300)","No limit"];
const EXPERIENCE_LEVELS=["Complete Beginner","Hobbyist (1–2 years)","Intermediate (3–5 years)","Advanced"];
const BUDGETS=["Tight (<$150)","Budget ($150–350)","Mid ($350–700)","Comfortable ($700–1500)","No limit"];
const MAINTENANCE_TIMES=["Minimal (30min/week)","Moderate (1–2hr/week)","Daily care ok"];

const CELL_COLORS:Record<string,string>={
  "🌿":"#1a6b4a","🪨":"#3a5a6b","🪵":"#6b4a1a","🐟":"rgba(0,180,216,0.25)",
  "🌱":"#1a5c3a","💧":"rgba(0,100,140,0.35)","🏔️":"#4a5568","⬜":"rgba(0,0,0,0.2)","🌾":"#3a6b1a",
};

const DEFAULT_FORM:TankForm={
  length:"",width:"",height:"",unit:"cm",
  shape:"Rectangular",ecosystem:"Freshwater Community",style:"Natural / Wabi-Kusa",
  fishWanted:"",fishCount:"",hasCenterpiece:"",
  wantsPlants:"yes",wantsHardscape:"both",
  filtration:"Canister Filter",co2:"No CO₂ / Natural",lighting:"Full Spectrum LED",lightingBudget:"Mid-range ($50–150)",
  experience:"Hobbyist (1–2 years)",budget:"Mid ($350–700)",maintenanceTime:"Moderate (1–2hr/week)",
  buildMode:"new",propsDescription:"",
};

function calcVolume(f:TankForm){
  const l=parseFloat(f.length),w=parseFloat(f.width),h=parseFloat(f.height);
  if(isNaN(l)||isNaN(w)||isNaN(h))return null;
  return Math.round(f.unit==="cm"?(l*w*h)/1000:l*w*h*0.00328);
}

// Build Pollinations URL — free, no API key, no signup
function buildImageUrl(prompt:string,seed:number,w:number=896,h:number=504):string{
  // Full cinematic prompt with quality boosters
  const fullPrompt = prompt + ", photorealistic, cinematic, no text, no watermark, award winning photography";
  const encoded=encodeURIComponent(fullPrompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&model=flux&nologo=true&seed=${seed}&enhance=true&safe=false`;
}

export default function DesignerPage(){
  const [form,setForm]=useState<TankForm>(DEFAULT_FORM);
  const [propImages,setPropImages]=useState<{name:string;base64:string;mime:string}[]>([]);
  const [designs,setDesigns]=useState<DesignIdea[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [activeDesign,setActiveDesign]=useState(0);
  const [step,setStep]=useState<"form"|"results">("form");
  const fileRef=useRef<HTMLInputElement>(null);
  const volume=calcVolume(form);
  const { user } = useAuth();

  const set=(k:keyof TankForm,v:string)=>setForm(p=>({...p,[k]:v}));

  const handlePropImage=useCallback((files:FileList)=>{
    Array.from(files).slice(0,4).forEach(f=>{
      if(!f.type.startsWith("image/"))return;
      const r=new FileReader();
      r.onload=e=>{
        const b64=(e.target?.result as string).split(",")[1];
        setPropImages(p=>[...p.slice(0,3),{name:f.name,base64:b64,mime:f.type}]);
      };r.readAsDataURL(f);
    });
  },[]);

  const handleGenerate=async()=>{
    if(!form.length||!form.width||!form.height){setError("Please enter tank dimensions.");return;}
    setLoading(true);setError(null);setDesigns([]);
    try{
      const res=await fetch("/api/design",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({form,propImages,volume})});
      if(!res.ok)throw new Error("Design generation failed. Please try again.");
      const data=await res.json();
      setDesigns(data.designs||[]);
      setStep("results");setActiveDesign(0);
      
      if (user) {
        await supabase.from("user_scans").insert({
          user_id: user.id,
          scan_type: "design",
          inputs: form,
          results: data.designs
        });
      }
    }catch(e:unknown){setError(e instanceof Error?e.message:"Something went wrong.");}
    finally{setLoading(false);}
  };

  return(
    <>
      <style>{`
        /* ── Layout ── */
        .d-wrap{max-width:680px;margin:0 auto;padding:32px 16px 100px;width:100%;}
        .d-hero{text-align:center;margin-bottom:36px;padding:0 8px;}
        .d-title{font-size:clamp(1.8rem,6vw,2.5rem);font-weight:800;background:linear-gradient(135deg,#00b4d8,#06d6a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:10px;line-height:1.15;}
        .d-sub{color:#5e9aaa;font-size:clamp(0.82rem,3.5vw,0.92rem);line-height:1.6;}

        /* ── Form sections ── */
        .fsec{background:rgba(255,255,255,.025);border:1px solid rgba(0,180,216,.14);border-radius:18px;padding:20px 18px;margin-bottom:16px;}
        .fsec-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-family:var(--font-mono);margin-bottom:18px;display:flex;align-items:center;gap:8px;}
        .frow{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
        .frow:last-child{margin-bottom:0;}
        .frow-3{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;}
        .fg{display:flex;flex-direction:column;gap:6px;}
        .flbl{font-size:0.68rem;text-transform:uppercase;letter-spacing:1.5px;color:#3d7080;font-family:var(--font-mono);font-weight:700;}
        .finput{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.09);border-radius:12px;color:#e8f4f0;font-family:var(--font-display);font-size:0.9rem;padding:13px 14px;transition:border-color .2s;outline:none;width:100%;-webkit-appearance:none;appearance:none;}
        .finput:focus{border-color:rgba(0,180,216,.5);background:rgba(0,180,216,.06);}
        .finput option{background:#071520;}
        .unit-tog{display:flex;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.09);border-radius:12px;overflow:hidden;height:48px;}
        .unit-btn{flex:1;background:transparent;border:none;color:#5e9aaa;font-family:var(--font-mono);font-size:0.8rem;font-weight:700;cursor:pointer;padding:0 12px;transition:all .2s;-webkit-tap-highlight-color:transparent;}
        .unit-btn.act{background:rgba(0,180,216,.22);color:#00e5ff;}
        .vol-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(0,180,216,.12);border:1px solid rgba(0,180,216,.28);border-radius:20px;padding:6px 14px;font-size:0.78rem;font-weight:700;color:#00e5ff;font-family:var(--font-mono);margin-top:10px;}

        /* ── Chips ── */
        .chips{display:flex;flex-wrap:wrap;gap:7px;}
        .chip{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.08);border-radius:20px;padding:8px 13px;cursor:pointer;font-size:0.78rem;font-weight:600;color:#5e9aaa;transition:all .2s;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        .chip:hover,.chip:active{border-color:rgba(0,180,216,.4);color:#c2e4ed;}
        .chip.act{background:rgba(0,180,216,.15);border-color:#00b4d8;color:#00e5ff;}

        /* ── Build mode ── */
        .build-mode{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .mode-card{background:rgba(255,255,255,.03);border:2px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;cursor:pointer;transition:all .2s;text-align:center;-webkit-tap-highlight-color:transparent;}
        .mode-card:hover,.mode-card:active{border-color:rgba(0,180,216,.35);background:rgba(0,180,216,.06);}
        .mode-card.act{border-color:#00b4d8;background:rgba(0,180,216,.12);}
        .mode-ico{font-size:1.8rem;margin-bottom:8px;}
        .mode-title{font-size:0.85rem;font-weight:700;color:#c2e4ed;margin-bottom:4px;}
        .mode-desc{font-size:0.73rem;color:#4e8a9a;line-height:1.4;}

        /* ── Prop upload ── */
        .prop-drop{border:2px dashed rgba(0,180,216,.22);border-radius:14px;padding:24px 16px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(0,180,216,.03);-webkit-tap-highlight-color:transparent;}
        .prop-drop:hover,.prop-drop:active{border-color:#00b4d8;background:rgba(0,180,216,.07);}
        .prop-imgs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
        .prop-img-box{position:relative;width:72px;height:72px;border-radius:10px;overflow:hidden;border:1.5px solid rgba(0,180,216,.25);}
        .prop-img-box img{width:100%;height:100%;object-fit:cover;}
        .prop-remove{position:absolute;top:3px;right:3px;background:rgba(255,77,109,.88);border:none;border-radius:50%;width:18px;height:18px;cursor:pointer;color:white;font-size:0.6rem;display:flex;align-items:center;justify-content:center;}

        /* ── Generate button ── */
        .gen-wrap{text-align:center;margin-top:24px;}
        .gen-btn{background:linear-gradient(135deg,#00b4d8,#06d6a0);border:none;border-radius:16px;color:#040d14;font-family:var(--font-display);font-weight:800;font-size:1rem;padding:18px 40px;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:10px;width:100%;justify-content:center;max-width:360px;min-height:56px;-webkit-tap-highlight-color:transparent;}
        .gen-btn:hover:not(:disabled){opacity:.88;transform:translateY(-1px);}
        .gen-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;}

        /* ── Loading ── */
        .loading-state{text-align:center;padding:48px 20px;}
        .loading-fish{font-size:2.8rem;animation:swim 2s ease-in-out infinite;display:block;margin-bottom:16px;}
        @keyframes swim{0%,100%{transform:translateX(-8px)}50%{transform:translateX(8px)}}
        .loading-title{font-size:1.1rem;font-weight:700;color:#c2e4ed;margin-bottom:6px;}
        .loading-sub{color:#4e8a9a;font-size:0.82rem;font-family:var(--font-mono);}

        /* ── Results ── */
        .back-btn{background:none;border:none;color:#5e9aaa;cursor:pointer;font-family:var(--font-display);font-size:0.88rem;display:inline-flex;align-items:center;gap:6px;padding:0;margin-bottom:18px;-webkit-tap-highlight-color:transparent;}
        .back-btn:hover{color:#00e5ff;}
        .res-hdr{margin-bottom:20px;}
        .res-title{font-size:clamp(1.3rem,5vw,1.6rem);font-weight:800;color:#e8f4f0;margin-bottom:4px;}
        .res-sub{color:#5e9aaa;font-size:0.82rem;}

        /* ── Design tab bar — horizontal scroll on mobile ── */
        .design-tabs{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:20px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .design-tabs::-webkit-scrollbar{display:none;}
        .design-tab{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.08);border-radius:14px;padding:12px 16px;cursor:pointer;white-space:nowrap;transition:all .2s;min-width:130px;text-align:left;flex-shrink:0;-webkit-tap-highlight-color:transparent;}
        .design-tab:hover,.design-tab:active{border-color:rgba(0,180,216,.35);}
        .design-tab.act{background:rgba(0,180,216,.14);border-color:#00b4d8;}
        .dtab-num{font-size:0.62rem;font-family:var(--font-mono);color:#3d7080;margin-bottom:3px;text-transform:uppercase;letter-spacing:1px;}
        .dtab-name{font-size:0.85rem;font-weight:700;color:#c2e4ed;margin-bottom:2px;line-height:1.2;}
        .dtab-diff{font-size:0.7rem;color:#4e8a9a;}

        /* ── Design detail ── */
        .detail-card{background:rgba(255,255,255,.025);border:1px solid rgba(0,180,216,.18);border-radius:20px;overflow:hidden;animation:fadeUp .35s ease;}
        
        /* ── AI Image section ── */
        .ai-img-wrap{position:relative;width:100%;padding-bottom:56.25%;overflow:hidden;background:rgba(0,0,0,.3);}
        .ai-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
        .ai-img-overlay{position:absolute;bottom:0;left:0;right:0;padding:20px 20px 16px;background:linear-gradient(transparent,rgba(4,13,20,.95));}
        .ai-img-title{font-size:clamp(1.1rem,4vw,1.5rem);font-weight:800;color:#e8f4f0;letter-spacing:-.3px;margin-bottom:4px;line-height:1.2;}
        .ai-img-tagline{font-size:0.82rem;color:#7ab8c5;line-height:1.4;}
        .ai-img-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;}
        .ai-img-spinner{width:32px;height:32px;border:3px solid rgba(0,180,216,.2);border-top-color:#00b4d8;border-radius:50%;animation:spin .8s linear infinite;}
        .ai-img-loading-text{font-size:0.78rem;color:#4e8a9a;font-family:var(--font-mono);}
        .ai-powered-badge{position:absolute;top:10px;right:10px;background:rgba(4,13,20,.8);backdrop-filter:blur(8px);border:1px solid rgba(0,180,216,.3);border-radius:20px;padding:4px 10px;font-size:0.68rem;font-weight:700;color:#00b4d8;font-family:var(--font-mono);}

        /* ── Badge row ── */
        .badge-row{display:flex;gap:7px;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.06);}
        .badge{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:20px;font-size:0.72rem;font-weight:700;font-family:var(--font-mono);}
        .bdiff{background:rgba(255,209,102,.12);border:1px solid rgba(255,209,102,.3);color:#ffd166;}
        .bbudget{background:rgba(6,214,160,.1);border:1px solid rgba(6,214,160,.25);color:#06d6a0;}
        .bcost{background:rgba(0,180,216,.1);border:1px solid rgba(0,180,216,.25);color:#00e5ff;}

        /* ── Top-down layout ── */
        .td-wrap{padding:18px 18px 0;}
        .td-title{font-size:0.68rem;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-weight:700;font-family:var(--font-mono);margin-bottom:10px;}
        .td-grid-outer{overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .td-grid{display:inline-grid;gap:2px;border:1.5px solid rgba(0,180,216,.22);border-radius:10px;overflow:hidden;background:rgba(0,20,30,.4);padding:5px;}
        .td-row{display:flex;gap:2px;}
        .td-cell{width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;border-radius:3px;flex-shrink:0;}
        .legend{margin-top:10px;display:flex;flex-wrap:wrap;gap:7px;}
        .legend-item{display:flex;align-items:center;gap:4px;font-size:0.68rem;color:#5e9aaa;font-family:var(--font-mono);}

        /* ── Stocking / Plants ── */
        .dsec{padding:18px 18px 0;}
        .dsec-t{font-size:0.68rem;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-weight:700;font-family:var(--font-mono);margin-bottom:12px;}
        .dsec-last{padding-bottom:22px;}
        .item-list{display:flex;flex-direction:column;gap:7px;}
        .item-row{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:11px;padding:10px 13px;display:flex;align-items:center;gap:10px;}
        .item-qty{background:rgba(0,180,216,.15);color:#00e5ff;font-family:var(--font-mono);font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:6px;flex-shrink:0;}
        .item-name{font-size:0.86rem;font-weight:600;color:#c2e4ed;flex:1;line-height:1.3;}
        .item-role{font-size:0.73rem;color:#4e8a9a;font-style:italic;}
        .zone-badge{font-size:0.67rem;padding:2px 8px;border-radius:6px;font-family:var(--font-mono);font-weight:600;flex-shrink:0;}
        .zfg{background:rgba(6,214,160,.15);color:#06d6a0;}
        .zmg{background:rgba(0,180,216,.15);color:#00b4d8;}
        .zbg{background:rgba(72,202,228,.15);color:#48cae4;}
        .zfl{background:rgba(255,209,102,.15);color:#ffd166;}

        /* ── Equipment ── */
        .equip-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
        .equip-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px 13px;}
        .equip-lbl{font-size:0.63rem;text-transform:uppercase;letter-spacing:1.5px;color:#3d7080;font-family:var(--font-mono);margin-bottom:4px;}
        .equip-val{font-size:0.83rem;font-weight:600;color:#b0d4df;line-height:1.4;}

        /* ── Water params ── */
        .wparams{display:flex;gap:9px;flex-wrap:wrap;}
        .wp{background:rgba(0,180,216,.08);border:1px solid rgba(0,180,216,.2);border-radius:10px;padding:10px 14px;}
        .wp-k{display:block;font-size:0.63rem;text-transform:uppercase;letter-spacing:1.5px;color:#3d7080;margin-bottom:2px;font-family:var(--font-mono);}
        .wp-v{font-size:0.92rem;font-weight:700;color:#00e5ff;}

        /* ── Timeline ── */
        .timeline{display:flex;flex-direction:column;}
        .tl-item{display:flex;gap:14px;}
        .tl-l{display:flex;flex-direction:column;align-items:center;}
        .tl-dot{width:9px;height:9px;border-radius:50%;background:#00b4d8;flex-shrink:0;margin-top:4px;}
        .tl-line{width:2px;flex:1;background:rgba(0,180,216,.18);margin:3px 0;min-height:16px;}
        .tl-item:last-child .tl-line{display:none;}
        .tl-week{font-size:0.66rem;color:#00b4d8;font-family:var(--font-mono);font-weight:700;margin-bottom:2px;}
        .tl-task{font-size:0.82rem;color:#9ec8d4;line-height:1.5;margin-bottom:12px;}

        /* ── Pros/Cons — stack on mobile ── */
        .pros-cons{display:grid;grid-template-columns:1fr;gap:12px;}
        @media(min-width:500px){.pros-cons{grid-template-columns:1fr 1fr;}}
        .pros-box{background:rgba(6,214,160,.07);border:1px solid rgba(6,214,160,.2);border-radius:12px;padding:14px 16px;}
        .cons-box{background:rgba(255,140,66,.07);border:1px solid rgba(255,140,66,.2);border-radius:12px;padding:14px 16px;}
        .pc-title{font-size:0.68rem;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;font-family:var(--font-mono);margin-bottom:9px;}
        .pros-box .pc-title{color:#06d6a0;}
        .cons-box .pc-title{color:#ff8c42;}
        .pc-list{list-style:none;display:flex;flex-direction:column;gap:7px;}
        .pc-list li{font-size:0.82rem;color:#9ec8d4;line-height:1.5;padding-left:17px;position:relative;}
        .pros-box .pc-list li::before{content:"✓";position:absolute;left:0;color:#06d6a0;font-weight:700;}
        .cons-box .pc-list li::before{content:"✗";position:absolute;left:0;color:#ff8c42;}

        /* ── Hardscape tags ── */
        .hs-tag{background:rgba(196,163,90,.12);border:1px solid rgba(196,163,90,.25);border-radius:20px;padding:5px 12px;font-size:0.78rem;color:#c4a35a;font-weight:600;}

        /* ── Maintenance ── */
        .maint-item{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:12px 14px;margin-bottom:9px;}
        .maint-lbl{font-size:0.66rem;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:#00b4d8;font-weight:700;margin-bottom:7px;}
        .maint-task{font-size:0.82rem;color:#9ec8d4;padding-left:14px;position:relative;margin-bottom:5px;line-height:1.5;}
        .maint-task::before{content:"·";position:absolute;left:0;color:#06d6a0;}

        /* separator */
        .dsep{border:none;border-top:1px solid rgba(255,255,255,.06);margin:0;}

        @media(max-width:400px){
          .frow-3{grid-template-columns:1fr 1fr;row-gap:10px;}
          .equip-grid{grid-template-columns:1fr;}
          .build-mode{grid-template-columns:1fr;}
        }
      `}</style>

      <nav className="nav">
        <a className="nav-logo" href="/"><span className="nav-logo-icon">🐠</span><span className="nav-logo-text">AquaScan</span></a>
        <div className="nav-tabs">
          <Link href="/" className="nav-tab">🔬 <span className="tab-label">Scanner</span></Link>
          <Link href="/designer" className="nav-tab active">🎨 <span className="tab-label">Designer</span></Link>
        </div>
        <AuthButton />
      </nav>
      <div className="orbs">
        <div className="orb" style={{width:400,height:400,background:"#06d6a0",top:-160,right:-120}}/>
        <div className="orb" style={{width:350,height:350,background:"#00b4d8",bottom:-80,left:-80}}/>
      </div>

      <div className="page">
        <div className="d-wrap">
          {step==="results"?(
            <>
              <button className="back-btn" onClick={()=>setStep("form")}>← Back to Form</button>
              <div className="res-hdr">
                <div className="res-title">🎨 Your Tank Designs</div>
                <div className="res-sub">{form.length}×{form.width}×{form.height}{form.unit}{volume?` · ~${volume}L`:""} · Swipe tabs to switch designs</div>
              </div>
              <div className="design-tabs">
                {designs.map((d,i)=>(
                  <button key={i} className={`design-tab${activeDesign===i?" act":""}`} onClick={()=>setActiveDesign(i)}>
                    <div className="dtab-num">Design 0{i+1}</div>
                    <div className="dtab-name">{d.title}</div>
                    <div className="dtab-diff">{d.difficulty}</div>
                  </button>
                ))}
              </div>
              {/* Render all cards but only show active, this keeps image loading states intact across tab switches */}
              {designs.map((d,i)=>(
                <div key={i} style={{display: activeDesign===i?"block":"none"}}>
                  <DesignCard d={d} idx={i} formLength={form.length} formWidth={form.width} />
                </div>
              ))}
            </>
          ):(
            <>
              <div className="d-hero">
                <div className="d-title">Tank Designer</div>
                <p className="d-sub">Fill in your details and get 4 AI-designed aquascape concepts with realistic visuals, full stocking lists & setup guides</p>
              </div>

              {/* Dimensions */}
              <div className="fsec">
                <div className="fsec-title">📐 Tank Dimensions</div>
                <div className="frow-3">
                  <div className="fg"><label className="flbl">Length</label><input className="finput" type="number" inputMode="decimal" placeholder="120" value={form.length} onChange={e=>set("length",e.target.value)}/></div>
                  <div className="fg"><label className="flbl">Width</label><input className="finput" type="number" inputMode="decimal" placeholder="45" value={form.width} onChange={e=>set("width",e.target.value)}/></div>
                  <div className="fg"><label className="flbl">Height</label><input className="finput" type="number" inputMode="decimal" placeholder="50" value={form.height} onChange={e=>set("height",e.target.value)}/></div>
                  <div className="fg"><label className="flbl">Unit</label><div className="unit-tog"><button className={`unit-btn${form.unit==="cm"?" act":""}`} onClick={()=>set("unit","cm")}>cm</button><button className={`unit-btn${form.unit==="inch"?" act":""}`} onClick={()=>set("unit","inch")}>in</button></div></div>
                </div>
                {volume&&<div className="vol-badge">💧 ~{volume} liters</div>}
                <div className="fg" style={{marginTop:14}}>
                  <label className="flbl">Tank Shape</label>
                  <select className="finput" value={form.shape} onChange={e=>set("shape",e.target.value)}>{SHAPES.map(s=><option key={s}>{s}</option>)}</select>
                </div>
              </div>

              {/* Ecosystem */}
              <div className="fsec">
                <div className="fsec-title">🌊 Ecosystem & Style</div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>Ecosystem Type</label><div className="chips">{ECOSYSTEMS.map(e=><button key={e} className={`chip${form.ecosystem===e?" act":""}`} onClick={()=>set("ecosystem",e)}>{e}</button>)}</div></div>
                <div className="fg"><label className="flbl" style={{marginBottom:8,display:"block"}}>Aesthetic Style</label><div className="chips">{STYLES.map(s=><button key={s} className={`chip${form.style===s?" act":""}`} onClick={()=>set("style",s)}>{s}</button>)}</div></div>
              </div>

              {/* Livestock */}
              <div className="fsec">
                <div className="fsec-title">🐠 Livestock</div>
                <div className="fg" style={{marginBottom:12}}><label className="flbl">Fish / Species You Want</label><input className="finput" type="text" placeholder="e.g. neon tetras, corydoras — or 'surprise me!'" value={form.fishWanted} onChange={e=>set("fishWanted",e.target.value)}/></div>
                <div className="frow">
                  <div className="fg"><label className="flbl">Rough Count</label><input className="finput" type="text" placeholder="e.g. 20–30 small" value={form.fishCount} onChange={e=>set("fishCount",e.target.value)}/></div>
                  <div className="fg"><label className="flbl">Centerpiece Fish?</label><input className="finput" type="text" placeholder="e.g. Angelfish" value={form.hasCenterpiece} onChange={e=>set("hasCenterpiece",e.target.value)}/></div>
                </div>
                <div className="frow" style={{marginTop:2}}>
                  <div className="fg"><label className="flbl">Live Plants?</label><select className="finput" value={form.wantsPlants} onChange={e=>set("wantsPlants",e.target.value)}><option value="yes">Yes — planted</option><option value="low">Easy / low-tech</option><option value="no">No plants</option></select></div>
                  <div className="fg"><label className="flbl">Hardscape</label><select className="finput" value={form.wantsHardscape} onChange={e=>set("wantsHardscape",e.target.value)}><option value="both">Driftwood + Rocks</option><option value="driftwood">Driftwood only</option><option value="rocks">Rocks only</option><option value="none">None</option></select></div>
                </div>
              </div>

              {/* Equipment */}
              <div className="fsec">
                <div className="fsec-title">🔧 Equipment</div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>Filtration</label><div className="chips">{FILTRATIONS.map(f=><button key={f} className={`chip${form.filtration===f?" act":""}`} onClick={()=>set("filtration",f)}>{f}</button>)}</div></div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>CO₂ System</label><div className="chips">{CO2_OPTS.map(c=><button key={c} className={`chip${form.co2===c?" act":""}`} onClick={()=>set("co2",c)}>{c}</button>)}</div></div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>Lighting</label><div className="chips">{LIGHTING_TYPES.map(l=><button key={l} className={`chip${form.lighting===l?" act":""}`} onClick={()=>set("lighting",l)}>{l}</button>)}</div></div>
                <div className="fg"><label className="flbl" style={{marginBottom:8,display:"block"}}>Lighting Budget</label><div className="chips">{LIGHTING_BUDGETS.map(l=><button key={l} className={`chip${form.lightingBudget===l?" act":""}`} onClick={()=>set("lightingBudget",l)}>{l}</button>)}</div></div>
              </div>

              {/* Budget */}
              <div className="fsec">
                <div className="fsec-title">💰 Experience & Budget</div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>Your Experience</label><div className="chips">{EXPERIENCE_LEVELS.map(e=><button key={e} className={`chip${form.experience===e?" act":""}`} onClick={()=>set("experience",e)}>{e}</button>)}</div></div>
                <div className="fg" style={{marginBottom:14}}><label className="flbl" style={{marginBottom:8,display:"block"}}>Total Budget</label><div className="chips">{BUDGETS.map(b=><button key={b} className={`chip${form.budget===b?" act":""}`} onClick={()=>set("budget",b)}>{b}</button>)}</div></div>
                <div className="fg"><label className="flbl" style={{marginBottom:8,display:"block"}}>Maintenance Time</label><div className="chips">{MAINTENANCE_TIMES.map(m=><button key={m} className={`chip${form.maintenanceTime===m?" act":""}`} onClick={()=>set("maintenanceTime",m)}>{m}</button>)}</div></div>
              </div>

              {/* Build mode */}
              <div className="fsec">
                <div className="fsec-title">🛠️ Build Approach</div>
                <div className="build-mode">
                  <div className={`mode-card${form.buildMode==="existing"?" act":""}`} onClick={()=>set("buildMode","existing")}><div className="mode-ico">🔄</div><div className="mode-title">Use Existing Props</div><div className="mode-desc">Upload photos of your gear — AI designs around what you have</div></div>
                  <div className={`mode-card${form.buildMode==="new"?" act":""}`} onClick={()=>set("buildMode","new")}><div className="mode-ico">✨</div><div className="mode-title">Fresh Start</div><div className="mode-desc">AI recommends ideal gear within your budget</div></div>
                </div>
                <div style={{marginTop:16}}>
                  <label className="flbl" style={{marginBottom:8,display:"block"}}>{form.buildMode==="existing"?"Upload Props / Equipment Photos (optional, up to 4)":"Upload Inspiration Photos (optional)"}</label>
                  <div className="prop-drop" onClick={()=>fileRef.current?.click()}>
                    <div style={{fontSize:"1.8rem",marginBottom:6}}>📎</div>
                    <div style={{fontSize:"0.82rem",color:"#5e9aaa"}}>Tap to upload {form.buildMode==="existing"?"your filter, lights, driftwood, rocks":"inspiration tank photos"}</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>e.target.files&&handlePropImage(e.target.files)}/>
                  {propImages.length>0&&(
                    <div className="prop-imgs">
                      {propImages.map((p,i)=>(
                        <div key={i} className="prop-img-box">
                          <img src={`data:${p.mime};base64,${p.base64}`} alt={p.name}/>
                          <button className="prop-remove" onClick={()=>setPropImages(prev=>prev.filter((_,j)=>j!==i))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{marginTop:14}}>
                  <label className="flbl" style={{marginBottom:8,display:"block"}}>Extra notes (optional)</label>
                  <textarea className="finput" rows={3} placeholder="e.g. I already have spider wood, want a blackwater feel, no aggressive fish..." value={form.propsDescription} onChange={e=>set("propsDescription",e.target.value)} style={{resize:"vertical"}}/>
                </div>
              </div>

              {error&&<div className="err-box" style={{marginBottom:14}}>⚠️ {error}</div>}
              <div className="gen-wrap">
                <button className="gen-btn" onClick={handleGenerate} disabled={loading}>
                  {loading?<><span className="spin"/>&nbsp;Generating Designs...</>:"🎨 Generate 4 Design Ideas"}
                </button>
              </div>
              {loading&&(
                <div className="loading-state">
                  <span className="loading-fish">🐠</span>
                  <div className="loading-title">Crafting your aquascape...</div>
                  <div className="loading-sub">Analyzing · Designing · Generating images</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const ZONE_CLASS:Record<string,string>={foreground:"zfg",midground:"zmg",background:"zbg",floating:"zfl",fg:"zfg",mg:"zmg",bg:"zbg"};
const CELL_LEGEND:Record<string,string>={"🌿":"Plants","🪨":"Rock","🪵":"Driftwood","🐟":"Swim space","🌱":"Carpet","💧":"Open water","🏔️":"Stone pile","⬜":"Sand","🌾":"Stem grass"};

function DesignCard({d,idx,formLength,formWidth}:{d:DesignIdea;idx:number;formLength:string;formWidth:string}){
  // Staggered loading: delay loading of designs 2-4 to prevent rate limiting
  const [shouldLoad, setShouldLoad] = useState(false);
  import("react").then((m) => {
    // using dynamic useEffect to avoid top level import conflict if any
  });
  
  const [imgLoaded,setImgLoaded]=useState(false);
  const [imgError,setImgError]=useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const [tdLoaded,setTdLoaded]=useState(false);
  const [tdError,setTdError]=useState(false);
  const [tdRetry, setTdRetry] = useState(0);

  // Aspect ratio calculation for top-down view
  const l = parseFloat(formLength) || 120;
  const w = parseFloat(formWidth) || 45;
  const ratio = l / w;
  let tdW = 800;
  let tdH = Math.round(800 / ratio);
  if (tdH > 800) { tdH = 800; tdW = Math.round(800 * ratio); }

  const seed = idx*1000+(d.title?.length||0)*7 + retryCount;
  const tdSeed = seed + 500 + tdRetry;

  const imgUrl = (shouldLoad && d.imagePrompt) ? buildImageUrl(d.imagePrompt, seed) : "";
  const tdUrl = (shouldLoad && d.imagePromptTopDown) ? buildImageUrl(d.imagePromptTopDown, tdSeed, tdW, tdH) : "";

  const handleImgError = () => { if(retryCount < 3) setRetryCount(r=>r+1); else setImgError(true); };
  const handleTdError = () => { if(tdRetry < 3) setTdRetry(r=>r+1); else setTdError(true); };

  if (typeof window !== 'undefined' && !shouldLoad) {
    setTimeout(() => setShouldLoad(true), idx * 2500); // 2.5s delay per index
  }

  return(
    <div className="detail-card">
      {/* AI Image hero */}
      <div className="ai-img-wrap">
        {!imgError&&imgUrl?(
          <>
            {!imgLoaded&&(
              <div className="ai-img-placeholder">
                <div className="ai-img-spinner"/>
                <div className="ai-img-loading-text">Generating realistic aquascape...</div>
              </div>
            )}
              <img
              className="ai-img"
              src={imgUrl}
              alt={d.title}
              style={{opacity:imgLoaded?1:0,transition:"opacity 0.5s"}}
              onLoad={()=>setImgLoaded(true)}
              onError={handleImgError}
            />
          </>
        ):(
          <div className="ai-img-placeholder" style={{background:"rgba(0,20,35,0.8)"}}>
            <div style={{fontSize:"3rem"}}>🐠</div>
            <div style={{fontSize:"0.78rem",color:"#4e8a9a",fontFamily:"var(--font-mono)"}}>Design {idx+1}</div>
          </div>
        )}
        <div className="ai-img-overlay">
          <div className="ai-img-title">{d.title}</div>
          <div className="ai-img-tagline">{d.tagline}</div>
        </div>
        <div className="ai-powered-badge">✦ AI IMAGE</div>
      </div>

      {/* Badges */}
      <div className="badge-row">
        <span className="badge bdiff">🎯 {d.difficulty}</span>
        <span className="badge bbudget">💰 {d.budgetMatch}</span>
        {d.estimatedCost&&<span className="badge bcost">~{d.estimatedCost}</span>}
        <span className="badge" style={{background:"rgba(72,202,228,.1)",border:"1px solid rgba(72,202,228,.25)",color:"#48cae4"}}>🎨 {d.theme}</span>
      </div>

      {/* Top-down layout AI Image */}
      {d.imagePromptTopDown&&(
        <div className="td-wrap" style={{marginTop:18}}>
          <div className="td-title">📐 Top-Down Tank Layout</div>
          <div style={{position:"relative",width:"100%",paddingBottom:`${(tdH/tdW)*100}%`,overflow:"hidden",borderRadius:"12px",background:"rgba(0,20,40,0.5)",border:"1.5px solid rgba(0,180,216,.22)"}}>
            {!tdError&&tdUrl?(
              <>
                {!tdLoaded&&(
                  <div className="ai-img-placeholder">
                    <div className="ai-img-spinner" style={{width:24,height:24,borderWidth:2}}/>
                    <div className="ai-img-loading-text" style={{fontSize:"0.7rem"}}>Rendering top-down view...</div>
                  </div>
                )}
                <img
                  src={tdUrl}
                  alt={`Top down view of ${d.title}`}
                  style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:tdLoaded?1:0,transition:"opacity 0.5s"}}
                  onLoad={()=>setTdLoaded(true)}
                  onError={handleTdError}
                />
              </>
            ):(
              <div className="ai-img-placeholder" style={{background:"rgba(0,20,35,0.8)"}}>
                <div style={{fontSize:"0.78rem",color:"#4e8a9a",fontFamily:"var(--font-mono)"}}>Layout preview unavailable</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Design vision */}
      {d.layoutDescription&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">🎨 Design Vision</div>
          <p style={{color:"#9ec8d4",fontSize:"0.88rem",lineHeight:1.7}}>{d.layoutDescription}</p>
        </div>
      )}

      <hr className="dsep" style={{marginTop:18}}/>

      {/* Stocking */}
      {d.stockingList&&d.stockingList.length>0&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">🐟 Stocking List</div>
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

      {/* Plants */}
      {d.plantList&&d.plantList.length>0&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">🌿 Plant List</div>
          <div className="item-list">
            {d.plantList.map((p,i)=>(
              <div key={i} className="item-row">
                <span className={`zone-badge ${ZONE_CLASS[p.zone?.toLowerCase()]||"zmg"}`}>{p.zone}</span>
                <div className="item-name" style={{flex:1}}>{p.name}</div>
                <span className="item-qty">×{p.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="dsep" style={{marginTop:18}}/>

      {/* Equipment */}
      <div className="dsec" style={{marginTop:18}}>
        <div className="dsec-t">🔧 Equipment</div>
        <div className="equip-grid">
          <div className="equip-item"><div className="equip-lbl">Filtration</div><div className="equip-val">{d.filtrationRec}</div></div>
          <div className="equip-item"><div className="equip-lbl">Lighting</div><div className="equip-val">{d.lightingRec}</div></div>
          <div className="equip-item"><div className="equip-lbl">CO₂</div><div className="equip-val">{d.co2Rec}</div></div>
          <div className="equip-item"><div className="equip-lbl">Substrate</div><div className="equip-val">{d.substrate}</div></div>
        </div>
      </div>

      {/* Hardscape */}
      {d.hardscape&&d.hardscape.length>0&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">🪵 Hardscape</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{d.hardscape.map((h,i)=><span key={i} className="hs-tag">{h}</span>)}</div>
        </div>
      )}

      {/* Water params */}
      {d.waterParams&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">💧 Water Parameters</div>
          <div className="wparams">
            <div className="wp"><span className="wp-k">pH</span><span className="wp-v">{d.waterParams.ph}</span></div>
            <div className="wp"><span className="wp-k">Temperature</span><span className="wp-v">{d.waterParams.temp}</span></div>
            <div className="wp"><span className="wp-k">Hardness</span><span className="wp-v">{d.waterParams.hardness}</span></div>
          </div>
        </div>
      )}

      <hr className="dsep" style={{marginTop:18}}/>

      {/* Setup timeline */}
      {d.setupTimeline&&d.setupTimeline.length>0&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">📅 Setup Timeline</div>
          <div className="timeline">
            {d.setupTimeline.map((t,i)=>(
              <div key={i} className="tl-item">
                <div className="tl-l"><div className="tl-dot"/><div className="tl-line"/></div>
                <div><div className="tl-week">{t.week}</div><div className="tl-task">{t.task}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compatibility */}
      {d.compatibilityNotes&&(
        <div className="dsec" style={{marginTop:4}}>
          <div className="dsec-t">⚠️ Compatibility</div>
          <p style={{color:"#9ec8d4",fontSize:"0.86rem",lineHeight:1.6}}>{d.compatibilityNotes}</p>
        </div>
      )}

      {/* Pros / Cons */}
      {(d.pros?.length>0||d.cons?.length>0)&&(
        <div className="dsec" style={{marginTop:18}}>
          <div className="dsec-t">⚖️ Pros & Cons</div>
          <div className="pros-cons">
            <div className="pros-box"><div className="pc-title">Pros</div><ul className="pc-list">{d.pros?.map((p,i)=><li key={i}>{p}</li>)}</ul></div>
            <div className="cons-box"><div className="pc-title">Cons</div><ul className="pc-list">{d.cons?.map((c,i)=><li key={i}>{c}</li>)}</ul></div>
          </div>
        </div>
      )}

      {/* Maintenance */}
      {d.maintenanceSchedule&&d.maintenanceSchedule.length>0&&(
        <div className="dsec dsec-last" style={{marginTop:18}}>
          <div className="dsec-t">🗓️ Maintenance</div>
          {d.maintenanceSchedule.map((m,i)=>(
            <div key={i} className="maint-item">
              <div className="maint-lbl">{m.frequency}</div>
              {m.tasks.map((t,j)=><div key={j} className="maint-task">{t}</div>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

