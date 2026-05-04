"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./globals.css";

type ScanCategory = "plant" | "fish" | "driftwood" | "sand";

interface ScanResult {
  category: ScanCategory;
  name: string;
  scientificName?: string;
  description: string;
  aquariumSuitability: "excellent" | "good" | "moderate" | "poor" | "not_suitable";
  suitabilityReason: string;
  co2Required?: boolean;
  co2Notes?: string;
  lightingNeeds?: string;
  waterParameters?: { ph?: string; temperature?: string; hardness?: string };
  careLevel?: string;
  growthRate?: string;
  size?: string;
  origin?: string;
  compatibility?: string;
  diet?: string;
  behavior?: string;
  tankSize?: string;
  specialNotes?: string[];
  tips: string[];
}

const CAT_LABELS: Record<ScanCategory, string> = { plant: "Aquatic Plant", fish: "Fish", driftwood: "Driftwood", sand: "Substrate" };
const CAT_ICONS: Record<ScanCategory, string> = { plant: "🌿", fish: "🐟", driftwood: "🪵", sand: "🪨" };
const SUIT_CFG = {
  excellent: { label: "Excellent", color: "#00ff9d", bg: "rgba(0,255,157,0.1)" },
  good: { label: "Good", color: "#7fff6b", bg: "rgba(127,255,107,0.1)" },
  moderate: { label: "Moderate", color: "#ffd166", bg: "rgba(255,209,102,0.1)" },
  poor: { label: "Poor", color: "#ff8c42", bg: "rgba(255,140,66,0.1)" },
  not_suitable: { label: "Not Suitable", color: "#ff4d6d", bg: "rgba(255,77,109,0.1)" },
};

function NavBar() {
  return (
    <nav className="nav">
      <a className="nav-logo" href="/">
        <span className="nav-logo-icon">🐠</span>
        <span className="nav-logo-text">AquaScan</span>
      </a>
      <div className="nav-tabs">
        <Link href="/" className="nav-tab active">
          🔬 <span className="tab-label">Scanner</span>
        </Link>
        <Link href="/designer" className="nav-tab">
          🎨 <span className="tab-label">Tank Designer</span>
        </Link>
      </div>
    </nav>
  );
}

export default function ScannerPage() {
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [cat, setCat] = useState<ScanCategory>("plant");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setResult(null); setError(null);
    const r = new FileReader();
    r.onload = (e) => setImg(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const handleScan = async () => {
    if (!file || !img) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const base64 = img.split(",")[1];
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, category: cat, mimeType: file.type }),
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
        .scanner-wrap { max-width: 720px; margin: 0 auto; padding: 48px 20px 80px; }
        .scanner-hero { text-align: center; margin-bottom: 48px; }
        .scanner-title { font-size: 2.6rem; font-weight: 800; background: linear-gradient(135deg,#00b4d8,#06d6a0); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; letter-spacing:-1px; margin-bottom: 10px; }
        .scanner-sub { color: #5e9aaa; font-size: 0.95rem; line-height: 1.6; }
        .cat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 28px; }
        .cat-btn { background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px 8px; cursor: pointer; color: #5e9aaa; display: flex; flex-direction: column; align-items: center; gap: 7px; transition: all 0.2s; font-size: 0.78rem; font-weight: 700; font-family: var(--font-display); letter-spacing: 0.5px; }
        .cat-btn:hover { background: rgba(0,180,216,0.1); border-color: rgba(0,180,216,0.35); color: #c2e4ed; }
        .cat-btn.act { background: rgba(0,180,216,0.15); border-color: #00b4d8; color: #00e5ff; box-shadow: 0 0 18px rgba(0,180,216,0.18); }
        .cat-ico { font-size: 1.8rem; }
        .drop { border: 2px dashed rgba(0,180,216,0.3); border-radius: 18px; padding: 64px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: rgba(0,180,216,0.03); }
        .drop:hover,.drop.dov { border-color: #00b4d8; background: rgba(0,180,216,0.08); }
        .drop-ico { font-size: 3.2rem; margin-bottom: 14px; }
        .drop-t { font-size: 1.05rem; font-weight: 700; color: #c2e4ed; margin-bottom: 7px; }
        .drop-s { font-size: 0.83rem; color: #3d7080; font-family: var(--font-mono); }
        .prev-box { position: relative; border-radius: 16px; overflow: hidden; border: 1.5px solid rgba(0,180,216,0.22); margin-bottom: 12px; }
        .prev-img { width: 100%; max-height: 360px; object-fit: cover; display: block; }
        .prev-badge { position: absolute; top: 12px; left: 12px; background: rgba(4,13,20,0.88); backdrop-filter: blur(10px); border: 1px solid rgba(0,180,216,0.3); border-radius: 20px; padding: 6px 14px; font-size: 0.8rem; font-weight: 700; color: #00e5ff; font-family: var(--font-mono); }
        .prev-acts { display: flex; gap: 10px; }
        /* Result card */
        .rcard { background: rgba(255,255,255,0.025); border: 1px solid rgba(0,180,216,0.18); border-radius: 20px; overflow: hidden; margin-top: 28px; animation: fadeUp 0.4s ease; }
        .rhdr { display: flex; align-items: flex-start; gap: 16px; padding: 26px 26px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .rico { font-size: 2.8rem; }
        .rcat { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 2.5px; color: #00b4d8; font-weight: 700; font-family: var(--font-mono); margin-bottom: 4px; }
        .rname { font-size: 1.65rem; font-weight: 800; color: #e8f4f0; letter-spacing: -0.5px; margin-bottom: 3px; }
        .rsci { font-style: italic; color: #4e8a9a; font-size: 0.88rem; }
        .suit { margin: 18px 18px 0; border: 1px solid; border-radius: 14px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .suit-lbl { font-weight: 700; font-size: 0.9rem; display: block; margin-bottom: 4px; }
        .suit-r { margin: 0; color: #7ab8c5; font-size: 0.83rem; line-height: 1.5; }
        .suit-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
        .iblk { padding: 18px 26px 0; }
        .iblk-t { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 2px; color: #00b4d8; font-weight: 700; font-family: var(--font-mono); margin-bottom: 9px; }
        .desc-t { color: #9ec8d4; line-height: 1.7; font-size: 0.92rem; }
        .co2b { margin: 18px 18px 0; border-radius: 14px; padding: 14px 18px; display: flex; gap: 14px; align-items: flex-start; }
        .co2-yes { background: rgba(0,180,216,0.08); border: 1px solid rgba(0,180,216,0.22); }
        .co2-no { background: rgba(6,214,160,0.08); border: 1px solid rgba(6,214,160,0.22); }
        .co2-ico { font-size: 1.4rem; }
        .co2-lbl { font-size: 0.88rem; color: #c2e4ed; margin-bottom: 3px; }
        .co2-lbl strong { color: #e8f4f0; }
        .co2-n { font-size: 0.81rem; color: #5e9aaa; line-height: 1.5; }
        .sgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(170px,1fr)); gap: 9px; padding: 18px 18px 0; }
        .sbox { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; }
        .sico { font-size: 1.15rem; flex-shrink: 0; margin-top: 1px; }
        .slbl { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #3d7080; margin-bottom: 3px; font-family: var(--font-mono); }
        .sval { font-size: 0.85rem; font-weight: 600; color: #b0d4df; line-height: 1.3; }
        .params { display: flex; gap: 12px; flex-wrap: wrap; }
        .param { background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 10px 16px; }
        .pk { display: block; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 1.5px; color: #3d7080; margin-bottom: 3px; font-family: var(--font-mono); }
        .pv { font-size: 0.92rem; font-weight: 700; color: #00e5ff; }
        .nlist,.tlist { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .nlist li,.tlist li { padding-left: 22px; position: relative; color: #9ec8d4; font-size: 0.88rem; line-height: 1.55; }
        .nlist li::before { content: "⚠"; position: absolute; left: 0; color: #ffd166; }
        .tlist li::before { content: "→"; position: absolute; left: 0; color: #06d6a0; font-weight: 700; }
        .tips-blk { background: rgba(6,214,160,0.04); border-top: 1px solid rgba(6,214,160,0.1); margin-top: 18px; padding: 18px 26px 22px; }
        .rcard-end { padding-bottom: 22px; }
        @media(max-width:500px){.cat-grid{grid-template-columns:repeat(2,1fr)}.scanner-title{font-size:2rem}.prev-acts{flex-direction:column}}
      `}</style>
      <NavBar />
      <div className="orbs">
        <div className="orb" style={{width:500,height:500,background:"#00b4d8",top:-150,left:-150}}/>
        <div className="orb" style={{width:400,height:400,background:"#06d6a0",bottom:-100,right:-100}}/>
        <div className="orb" style={{width:280,height:280,background:"#48cae4",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
      </div>
      <div className="page">
        <div className="scanner-wrap">
          <div className="scanner-hero">
            <div className="scanner-title">Aquarium Scanner</div>
            <p className="scanner-sub">Photograph any aquatic plant, fish, driftwood or substrate<br/>and get instant expert identification & care details</p>
          </div>

          <label className="sec-lbl">What are you scanning?</label>
          <div className="cat-grid">
            {(Object.keys(CAT_LABELS) as ScanCategory[]).map(c => (
              <button key={c} onClick={() => setCat(c)} className={`cat-btn${cat === c ? " act" : ""}`}>
                <span className="cat-ico">{CAT_ICONS[c]}</span>{CAT_LABELS[c]}
              </button>
            ))}
          </div>

          <label className="sec-lbl">Upload Image</label>
          {!img ? (
            <div className={`drop${dragOver ? " dov" : ""}`}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f) handleFile(f); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}>
              <div className="drop-ico">📷</div>
              <div className="drop-t">Drop image here or click to browse</div>
              <div className="drop-s">JPG · PNG · WEBP · GIF</div>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              <div className="prev-box">
                <img src={img} alt="Preview" className="prev-img" />
                <div className="prev-badge">{CAT_ICONS[cat]} {CAT_LABELS[cat]}</div>
              </div>
              <div className="prev-acts">
                <button className="btn-primary" style={{flex:1}} onClick={handleScan} disabled={loading}>
                  {loading ? <><span className="spin"/>&nbsp;Analyzing...</> : "🔬 Scan Now"}
                </button>
                <button className="btn-ghost" onClick={reset} disabled={loading}>↩ Change</button>
              </div>
            </div>
          )}

          {error && <div className="err-box" style={{marginTop:16}}>⚠️ {error}</div>}
          {loading && <div className="shimmer-card" style={{marginTop:24}}>{[40,70,55,80].map((w,i)=><div key={i} className="shimmer-row" style={{width:`${w}%`}}/>)}</div>}
          {result && !loading && <ResultCard r={result} />}
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
          {r.scientificName && <div className="rsci">{r.scientificName}</div>}
        </div>
      </div>
      <div className="suit" style={{background:s.bg,borderColor:s.color+"44"}}>
        <div><span className="suit-lbl" style={{color:s.color}}>Aquarium Suitability: {s.label}</span><p className="suit-r">{r.suitabilityReason}</p></div>
        <div className="suit-dot" style={{background:s.color,boxShadow:`0 0 10px ${s.color}`}}/>
      </div>
      <div className="iblk"><div className="iblk-t">📖 Overview</div><p className="desc-t">{r.description}</p></div>
      {r.co2Required !== undefined && (
        <div className={`co2b ${r.co2Required ? "co2-yes" : "co2-no"}`}>
          <span className="co2-ico">{r.co2Required ? "💨" : "✅"}</span>
          <div><div className="co2-lbl">CO₂ Injection: <strong>{r.co2Required ? "Required" : "Not Required"}</strong></div>{r.co2Notes && <div className="co2-n">{r.co2Notes}</div>}</div>
        </div>
      )}
      <div className="sgrid">
        {r.lightingNeeds && <Stat ico="💡" lbl="Lighting" val={r.lightingNeeds}/>}
        {r.careLevel && <Stat ico="🎯" lbl="Care Level" val={r.careLevel}/>}
        {r.growthRate && <Stat ico="📈" lbl="Growth Rate" val={r.growthRate}/>}
        {r.size && <Stat ico="📏" lbl="Size" val={r.size}/>}
        {r.origin && <Stat ico="🌍" lbl="Origin" val={r.origin}/>}
        {r.tankSize && <Stat ico="🪣" lbl="Min Tank" val={r.tankSize}/>}
        {r.diet && <Stat ico="🍽️" lbl="Diet" val={r.diet}/>}
        {r.behavior && <Stat ico="🤝" lbl="Behavior" val={r.behavior}/>}
        {r.compatibility && <Stat ico="♻️" lbl="Compatibility" val={r.compatibility}/>}
      </div>
      {r.waterParameters && (
        <div className="iblk" style={{marginTop:18}}>
          <div className="iblk-t">💧 Water Parameters</div>
          <div className="params">
            {r.waterParameters.ph && <div className="param"><span className="pk">pH</span><span className="pv">{r.waterParameters.ph}</span></div>}
            {r.waterParameters.temperature && <div className="param"><span className="pk">Temperature</span><span className="pv">{r.waterParameters.temperature}</span></div>}
            {r.waterParameters.hardness && <div className="param"><span className="pk">Hardness</span><span className="pv">{r.waterParameters.hardness}</span></div>}
          </div>
        </div>
      )}
      {r.specialNotes && r.specialNotes.length > 0 && (
        <div className="iblk" style={{marginTop:18}}><div className="iblk-t">⚠️ Special Notes</div><ul className="nlist">{r.specialNotes.map((n,i)=><li key={i}>{n}</li>)}</ul></div>
      )}
      {r.tips && r.tips.length > 0 && (
        <div className="tips-blk"><div className="iblk-t">💡 Pro Tips</div><ul className="tlist">{r.tips.map((t,i)=><li key={i}>{t}</li>)}</ul></div>
      )}
    </div>
  );
}

function Stat({ ico, lbl, val }: { ico: string; lbl: string; val: string }) {
  return (
    <div className="sbox">
      <span className="sico">{ico}</span>
      <div><div className="slbl">{lbl}</div><div className="sval">{val}</div></div>
    </div>
  );
}
