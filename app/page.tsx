"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import "./globals.css";

type ScanCategory = "plant" | "fish" | "driftwood" | "sand";
interface ScanResult {
  category: ScanCategory; name: string; scientificName?: string; description: string;
  aquariumSuitability: "excellent"|"good"|"moderate"|"poor"|"not_suitable"; suitabilityReason: string;
  co2Required?: boolean; co2Notes?: string; lightingNeeds?: string;
  waterParameters?: { ph?: string; temperature?: string; hardness?: string };
  careLevel?: string; growthRate?: string; size?: string; origin?: string;
  compatibility?: string; diet?: string; behavior?: string; tankSize?: string;
  specialNotes?: string[]; tips: string[];
}

const CAT_LABELS: Record<ScanCategory,string> = { plant:"Aquatic Plant", fish:"Fish", driftwood:"Driftwood", sand:"Substrate" };
const CAT_ICONS: Record<ScanCategory,string> = { plant:"🌿", fish:"🐟", driftwood:"🪵", sand:"🪨" };
const SUIT_CFG = {
  excellent:  { label:"Excellent",    color:"#00ff9d", bg:"rgba(0,255,157,0.1)" },
  good:       { label:"Good",         color:"#7fff6b", bg:"rgba(127,255,107,0.1)" },
  moderate:   { label:"Moderate",     color:"#ffd166", bg:"rgba(255,209,102,0.1)" },
  poor:       { label:"Poor",         color:"#ff8c42", bg:"rgba(255,140,66,0.1)" },
  not_suitable:{ label:"Not Suitable",color:"#ff4d6d", bg:"rgba(255,77,109,0.1)" },
};

export default function ScannerPage() {
  const [img, setImg] = useState<string|null>(null);
  const [file, setFile] = useState<File|null>(null);
  const [cat, setCat] = useState<ScanCategory>("plant");
  const [result, setResult] = useState<ScanResult|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setResult(null); setError(null);
    const r = new FileReader();
    r.onload = e => setImg(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const handleScan = async () => {
    if (!file || !img) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ image: img.split(",")[1], category: cat, mimeType: file.type }),
      });
      if (!res.ok) throw new Error("Scan failed. Please try again.");
      setResult(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  const reset = () => { setImg(null); setFile(null); setResult(null); setError(null); };

  return (
    <>
      <style>{`
        .sc-wrap{max-width:640px;margin:0 auto;padding:32px 16px 80px;width:100%;}
        .sc-hero{text-align:center;margin-bottom:32px;padding:0 4px;}
        .sc-title{font-size:clamp(1.9rem,7vw,2.6rem);font-weight:800;background:linear-gradient(135deg,#00b4d8,#06d6a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:8px;line-height:1.1;}
        .sc-sub{color:#5e9aaa;font-size:clamp(0.82rem,3.5vw,0.94rem);line-height:1.6;}
        .cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:24px;}
        .cat-btn{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 6px 12px;cursor:pointer;color:#5e9aaa;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s;font-size:0.72rem;font-weight:700;font-family:var(--font-display);-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        .cat-btn:active{transform:scale(.96);}
        .cat-btn.act{background:rgba(0,180,216,.15);border-color:#00b4d8;color:#00e5ff;box-shadow:0 0 16px rgba(0,180,216,.18);}
        .cat-ico{font-size:1.6rem;line-height:1;}
        .drop{border:2px dashed rgba(0,180,216,.28);border-radius:18px;padding:52px 20px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(0,180,216,.03);-webkit-tap-highlight-color:transparent;}
        .drop.dov{border-color:#00b4d8;background:rgba(0,180,216,.08);}
        .drop-ico{font-size:2.8rem;margin-bottom:12px;}
        .drop-t{font-size:1rem;font-weight:700;color:#c2e4ed;margin-bottom:6px;}
        .drop-s{font-size:0.78rem;color:#3d7080;font-family:var(--font-mono);}
        .prev-box{position:relative;border-radius:14px;overflow:hidden;border:1.5px solid rgba(0,180,216,.22);margin-bottom:10px;}
        .prev-img{width:100%;max-height:300px;object-fit:cover;display:block;}
        .prev-badge{position:absolute;top:10px;left:10px;background:rgba(4,13,20,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(0,180,216,.3);border-radius:20px;padding:5px 12px;font-size:0.75rem;font-weight:700;color:#00e5ff;font-family:var(--font-mono);}
        .prev-acts{display:flex;gap:8px;}
        /* Result */
        .rcard{background:rgba(255,255,255,.025);border:1px solid rgba(0,180,216,.18);border-radius:18px;overflow:hidden;margin-top:24px;animation:fadeUp .4s ease;}
        .rhdr{display:flex;align-items:flex-start;gap:14px;padding:20px 18px 16px;border-bottom:1px solid rgba(255,255,255,.06);}
        .rico{font-size:2.4rem;line-height:1;flex-shrink:0;}
        .rcat{font-size:0.65rem;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-weight:700;font-family:var(--font-mono);margin-bottom:3px;}
        .rname{font-size:clamp(1.2rem,5vw,1.6rem);font-weight:800;color:#e8f4f0;letter-spacing:-.3px;margin-bottom:2px;line-height:1.2;}
        .rsci{font-style:italic;color:#4e8a9a;font-size:0.85rem;}
        .suit{margin:14px 14px 0;border:1px solid;border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;}
        .suit-lbl{font-weight:700;font-size:0.88rem;display:block;margin-bottom:3px;}
        .suit-r{margin:0;color:#7ab8c5;font-size:0.8rem;line-height:1.5;}
        .suit-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
        .iblk{padding:16px 18px 0;}
        .iblk-t{font-size:0.67rem;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-weight:700;font-family:var(--font-mono);margin-bottom:8px;}
        .desc-t{color:#9ec8d4;line-height:1.7;font-size:0.88rem;}
        .co2b{margin:14px 14px 0;border-radius:12px;padding:13px 16px;display:flex;gap:12px;align-items:flex-start;}
        .co2-yes{background:rgba(0,180,216,.08);border:1px solid rgba(0,180,216,.22);}
        .co2-no{background:rgba(6,214,160,.08);border:1px solid rgba(6,214,160,.22);}
        .co2-ico{font-size:1.3rem;flex-shrink:0;}
        .co2-lbl{font-size:0.86rem;color:#c2e4ed;margin-bottom:3px;}
        .co2-lbl strong{color:#e8f4f0;}
        .co2-n{font-size:0.78rem;color:#5e9aaa;line-height:1.5;}
        .sgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:14px 14px 0;}
        @media(min-width:420px){.sgrid{grid-template-columns:repeat(2,1fr);}}
        .sbox{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:11px;padding:11px 12px;display:flex;gap:9px;align-items:flex-start;}
        .sico{font-size:1.1rem;flex-shrink:0;margin-top:1px;}
        .slbl{font-size:0.62rem;text-transform:uppercase;letter-spacing:1.5px;color:#3d7080;margin-bottom:2px;font-family:var(--font-mono);}
        .sval{font-size:0.82rem;font-weight:600;color:#b0d4df;line-height:1.3;}
        .params{display:flex;gap:8px;flex-wrap:wrap;}
        .param{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:9px 13px;}
        .pk{display:block;font-size:0.63rem;text-transform:uppercase;letter-spacing:1.5px;color:#3d7080;margin-bottom:2px;font-family:var(--font-mono);}
        .pv{font-size:0.9rem;font-weight:700;color:#00e5ff;}
        .nlist,.tlist{list-style:none;display:flex;flex-direction:column;gap:7px;}
        .nlist li,.tlist li{padding-left:20px;position:relative;color:#9ec8d4;font-size:0.85rem;line-height:1.55;}
        .nlist li::before{content:"⚠";position:absolute;left:0;color:#ffd166;}
        .tlist li::before{content:"→";position:absolute;left:0;color:#06d6a0;font-weight:700;}
        .tips-blk{background:rgba(6,214,160,.04);border-top:1px solid rgba(6,214,160,.1);margin-top:16px;padding:16px 18px 20px;}
        @media(max-width:360px){.cat-grid{grid-template-columns:repeat(2,1fr);}.cat-ico{font-size:1.4rem;}}
      `}</style>

      <nav className="nav">
        <a className="nav-logo" href="/"><span className="nav-logo-icon">🐠</span><span className="nav-logo-text">AquaScan</span></a>
        <div className="nav-tabs">
          <Link href="/" className="nav-tab active">🔬 <span className="tab-label">Scanner</span></Link>
          <Link href="/designer" className="nav-tab">🎨 <span className="tab-label">Designer</span></Link>
        </div>
      </nav>
      <div className="orbs">
        <div className="orb" style={{width:400,height:400,background:"#00b4d8",top:-120,left:-120}}/>
        <div className="orb" style={{width:350,height:350,background:"#06d6a0",bottom:-80,right:-80}}/>
      </div>

      <div className="page">
        <div className="sc-wrap">
          <div className="sc-hero">
            <div className="sc-title">Aquarium Scanner</div>
            <p className="sc-sub">Photograph any plant, fish, driftwood or substrate — get instant expert ID & care details</p>
          </div>

          <label className="sec-lbl">What are you scanning?</label>
          <div className="cat-grid">
            {(Object.keys(CAT_LABELS) as ScanCategory[]).map(c => (
              <button key={c} onClick={() => setCat(c)} className={`cat-btn${cat===c?" act":""}`}>
                <span className="cat-ico">{CAT_ICONS[c]}</span>{CAT_LABELS[c]}
              </button>
            ))}
          </div>

          <label className="sec-lbl">Upload Image</label>
          {!img ? (
            <div className={`drop${dragOver?" dov":""}`}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}}
              onDragLeave={()=>setDragOver(false)}
              onClick={()=>fileRef.current?.click()}>
              <div className="drop-ico">📷</div>
              <div className="drop-t">Tap to upload or drag & drop</div>
              <div className="drop-s">JPG · PNG · WEBP</div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files?.[0]&&handleFile(e.target.files[0])}/>
            </div>
          ) : (
            <div>
              <div className="prev-box">
                <img src={img} alt="Preview" className="prev-img"/>
                <div className="prev-badge">{CAT_ICONS[cat]} {CAT_LABELS[cat]}</div>
              </div>
              <div className="prev-acts">
                <button className="btn-primary" style={{flex:1}} onClick={handleScan} disabled={loading}>
                  {loading?<><span className="spin"/>&nbsp;Analyzing...</>:"🔬 Scan Now"}
                </button>
                <button className="btn-ghost" onClick={reset} disabled={loading}>↩ Change</button>
              </div>
            </div>
          )}

          {error && <div className="err-box" style={{marginTop:14}}>⚠️ {error}</div>}
          {loading && <div className="shimmer-card" style={{marginTop:20}}>{[40,70,55,80].map((w,i)=><div key={i} className="shimmer-row" style={{width:`${w}%`}}/>)}</div>}
          {result && !loading && <ResultCard r={result}/>}
        </div>
      </div>
    </>
  );
}

function ResultCard({ r }: { r: ScanResult }) {
  const s = SUIT_CFG[r.aquariumSuitability];
  return (
    <div className="rcard">
      <div className="rhdr">
        <span className="rico">{CAT_ICONS[r.category]}</span>
        <div>
          <div className="rcat">{CAT_LABELS[r.category]}</div>
          <div className="rname">{r.name}</div>
          {r.scientificName&&<div className="rsci">{r.scientificName}</div>}
        </div>
      </div>
      <div className="suit" style={{background:s.bg,borderColor:s.color+"44"}}>
        <div><span className="suit-lbl" style={{color:s.color}}>Aquarium Suitability: {s.label}</span><p className="suit-r">{r.suitabilityReason}</p></div>
        <div className="suit-dot" style={{background:s.color,boxShadow:`0 0 8px ${s.color}`}}/>
      </div>
      <div className="iblk"><div className="iblk-t">📖 Overview</div><p className="desc-t">{r.description}</p></div>
      {r.co2Required!==undefined&&(
        <div className={`co2b ${r.co2Required?"co2-yes":"co2-no"}`}>
          <span className="co2-ico">{r.co2Required?"💨":"✅"}</span>
          <div><div className="co2-lbl">CO₂ Injection: <strong>{r.co2Required?"Required":"Not Required"}</strong></div>{r.co2Notes&&<div className="co2-n">{r.co2Notes}</div>}</div>
        </div>
      )}
      <div className="sgrid">
        {r.lightingNeeds&&<Stat ico="💡" lbl="Lighting" val={r.lightingNeeds}/>}
        {r.careLevel&&<Stat ico="🎯" lbl="Care Level" val={r.careLevel}/>}
        {r.growthRate&&<Stat ico="📈" lbl="Growth Rate" val={r.growthRate}/>}
        {r.size&&<Stat ico="📏" lbl="Size" val={r.size}/>}
        {r.origin&&<Stat ico="🌍" lbl="Origin" val={r.origin}/>}
        {r.tankSize&&<Stat ico="🪣" lbl="Min Tank" val={r.tankSize}/>}
        {r.diet&&<Stat ico="🍽️" lbl="Diet" val={r.diet}/>}
        {r.behavior&&<Stat ico="🤝" lbl="Behavior" val={r.behavior}/>}
      </div>
      {r.waterParameters&&(
        <div className="iblk" style={{marginTop:16}}>
          <div className="iblk-t">💧 Water Parameters</div>
          <div className="params">
            {r.waterParameters.ph&&<div className="param"><span className="pk">pH</span><span className="pv">{r.waterParameters.ph}</span></div>}
            {r.waterParameters.temperature&&<div className="param"><span className="pk">Temp</span><span className="pv">{r.waterParameters.temperature}</span></div>}
            {r.waterParameters.hardness&&<div className="param"><span className="pk">Hardness</span><span className="pv">{r.waterParameters.hardness}</span></div>}
          </div>
        </div>
      )}
      {r.specialNotes&&r.specialNotes.length>0&&(
        <div className="iblk" style={{marginTop:16}}><div className="iblk-t">⚠️ Special Notes</div><ul className="nlist">{r.specialNotes.map((n,i)=><li key={i}>{n}</li>)}</ul></div>
      )}
      {r.tips&&r.tips.length>0&&(
        <div className="tips-blk"><div className="iblk-t">💡 Pro Tips</div><ul className="tlist">{r.tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
      )}
    </div>
  );
}

function Stat({ ico, lbl, val }: { ico:string; lbl:string; val:string }) {
  return (
    <div className="sbox">
      <span className="sico">{ico}</span>
      <div><div className="slbl">{lbl}</div><div className="sval">{val}</div></div>
    </div>
  );
}
