"use client";

import { useState, useRef, useCallback } from "react";

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
  waterParameters?: { ph?: string; temperature?: string; hardness?: string; };
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

const categoryLabels: Record<ScanCategory, string> = {
  plant: "Aquatic Plant", fish: "Fish", driftwood: "Driftwood", sand: "Substrate / Sand",
};
const categoryIcons: Record<ScanCategory, string> = {
  plant: "🌿", fish: "🐟", driftwood: "🪵", sand: "🪨",
};
const suitabilityConfig = {
  excellent: { label: "Excellent", color: "#00ff9d", bg: "rgba(0,255,157,0.12)" },
  good: { label: "Good", color: "#7fff6b", bg: "rgba(127,255,107,0.12)" },
  moderate: { label: "Moderate", color: "#ffd166", bg: "rgba(255,209,102,0.12)" },
  poor: { label: "Poor", color: "#ff8c42", bg: "rgba(255,140,66,0.12)" },
  not_suitable: { label: "Not Suitable", color: "#ff4d6d", bg: "rgba(255,77,109,0.12)" },
};

export default function AquaScannerPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<ScanCategory>("plant");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setSelectedFile(file); setResult(null); setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setSelectedImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleScan = async () => {
    if (!selectedFile || !selectedImage) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const base64 = selectedImage.split(",")[1];
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, category, mimeType: selectedFile.type }),
      });
      if (!res.ok) throw new Error("Scan failed. Please try again.");
      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setSelectedImage(null); setSelectedFile(null); setResult(null); setError(null); };

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#040d14;color:#e8f4f0;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}
        .app{min-height:100vh;position:relative;overflow-x:hidden}
        .orbs{position:fixed;inset:0;pointer-events:none;z-index:0}
        .orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.18}
        .o1{width:500px;height:500px;background:#00b4d8;top:-150px;left:-150px}
        .o2{width:400px;height:400px;background:#06d6a0;bottom:-100px;right:-100px}
        .o3{width:300px;height:300px;background:#48cae4;top:50%;left:50%;transform:translate(-50%,-50%)}
        .wrap{max-width:760px;margin:0 auto;padding:40px 20px 80px;position:relative;z-index:1}
        .hdr{text-align:center;margin-bottom:48px}
        .logo{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:16px}
        .logo-ico{font-size:48px}
        .logo-t{font-size:2.8rem;font-weight:800;background:linear-gradient(135deg,#00b4d8,#06d6a0);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px}
        .logo-s{font-size:.78rem;color:#5e9aaa;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin-top:2px}
        .hdr-desc{color:#7ab8c5;font-size:1rem;max-width:480px;margin:0 auto;line-height:1.6}
        .sec{margin-bottom:32px}
        .sec-lbl{display:block;font-size:.75rem;text-transform:uppercase;letter-spacing:2px;color:#5e9aaa;font-weight:700;margin-bottom:12px}
        .cat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .cat-btn{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 8px;cursor:pointer;color:#8ecfdc;display:flex;flex-direction:column;align-items:center;gap:6px;transition:all .2s;font-size:.78rem;font-weight:600}
        .cat-btn:hover{background:rgba(0,180,216,.12);border-color:rgba(0,180,216,.4);color:#e8f4f0}
        .cat-btn.act{background:rgba(0,180,216,.18);border-color:#00b4d8;color:#00e5ff;box-shadow:0 0 20px rgba(0,180,216,.2)}
        .cat-ico{font-size:1.6rem}
        .drop{border:2px dashed rgba(0,180,216,.35);border-radius:16px;padding:60px 20px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(0,180,216,.04)}
        .drop:hover,.drop.dov{border-color:#00b4d8;background:rgba(0,180,216,.1)}
        .drop-ico{font-size:3rem;margin-bottom:12px}
        .drop-t{font-size:1.1rem;font-weight:600;color:#c2e4ed;margin-bottom:8px}
        .drop-s{font-size:.85rem;color:#5e9aaa}
        .prev-img{width:100%;max-height:380px;object-fit:cover;display:block;border-radius:16px;border:1.5px solid rgba(0,180,216,.25)}
        .prev-badge{position:absolute;top:12px;left:12px;background:rgba(4,13,20,.85);backdrop-filter:blur(8px);border:1px solid rgba(0,180,216,.3);border-radius:20px;padding:6px 14px;font-size:.82rem;font-weight:600;color:#00e5ff}
        .prev-wrap{position:relative;margin-bottom:12px}
        .prev-acts{display:flex;gap:10px}
        .btn-p{flex:1;background:linear-gradient(135deg,#00b4d8,#06d6a0);border:none;border-radius:12px;color:#040d14;font-weight:800;font-size:1rem;padding:16px;cursor:pointer;transition:opacity .2s}
        .btn-p:hover:not(:disabled){opacity:.9}
        .btn-p:disabled{opacity:.5;cursor:not-allowed}
        .btn-g{background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.1);border-radius:12px;color:#8ecfdc;font-weight:600;font-size:.9rem;padding:16px 24px;cursor:pointer;transition:all .2s;white-space:nowrap}
        .btn-g:hover:not(:disabled){background:rgba(255,255,255,.08);color:#e8f4f0}
        .spin{width:18px;height:18px;border:2.5px solid rgba(4,13,20,.4);border-top-color:#040d14;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;vertical-align:middle;margin-right:8px}
        @keyframes spin{to{transform:rotate(360deg)}}
        .err{background:rgba(255,77,109,.12);border:1px solid rgba(255,77,109,.3);border-radius:12px;padding:14px 18px;color:#ff8fa3;margin-bottom:24px}
        .shim{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:28px;margin-bottom:32px}
        .shim-r{height:14px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%);background-size:200% 100%;animation:shim 1.5s infinite;border-radius:6px;margin-bottom:14px}
        @keyframes shim{to{background-position:-200% 0}}
        .ftr{text-align:center;color:#3d7080;font-size:.8rem;margin-top:60px}
        /* Result */
        .rcard{background:rgba(255,255,255,.03);border:1px solid rgba(0,180,216,.18);border-radius:20px;overflow:hidden;margin-bottom:32px;animation:fu .4s ease}
        @keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .rhdr{display:flex;align-items:flex-start;gap:16px;padding:28px 28px 20px;border-bottom:1px solid rgba(255,255,255,.06)}
        .rico{font-size:3rem;line-height:1}
        .rcat{font-size:.72rem;text-transform:uppercase;letter-spacing:2px;color:#00b4d8;font-weight:700;margin-bottom:4px}
        .rname{font-size:1.7rem;font-weight:800;color:#e8f4f0;letter-spacing:-.5px;margin-bottom:4px}
        .rsci{font-style:italic;color:#5e9aaa;font-size:.9rem}
        .suit{margin:20px 20px 0;border:1px solid;border-radius:14px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
        .suit-lbl{font-weight:700;font-size:.95rem;display:block;margin-bottom:4px}
        .suit-r{margin:0;color:#9ec8d4;font-size:.85rem;line-height:1.5}
        .suit-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
        .iblk{padding:20px 28px 0}
        .iblk-t{font-size:.8rem;text-transform:uppercase;letter-spacing:1.5px;color:#00b4d8;font-weight:700;margin-bottom:10px}
        .desc{color:#b0d4df;line-height:1.7;font-size:.95rem}
        .co2b{margin:20px 20px 0;border-radius:14px;padding:16px 20px;display:flex;gap:14px;align-items:flex-start}
        .co2-yes{background:rgba(0,180,216,.1);border:1px solid rgba(0,180,216,.25)}
        .co2-no{background:rgba(6,214,160,.1);border:1px solid rgba(6,214,160,.25)}
        .co2-ico{font-size:1.5rem}
        .co2-lbl{font-size:.9rem;color:#c2e4ed}
        .co2-lbl strong{color:#e8f4f0}
        .co2-n{margin:4px 0 0;font-size:.83rem;color:#7ab8c5;line-height:1.5}
        .sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding:20px 20px 0}
        .sbox{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:flex-start}
        .sico{font-size:1.2rem;flex-shrink:0;margin-top:1px}
        .slbl{font-size:.68rem;text-transform:uppercase;letter-spacing:1px;color:#5e9aaa;margin-bottom:2px}
        .sval{font-size:.88rem;font-weight:600;color:#c2e4ed;line-height:1.3}
        .params{display:flex;gap:16px;flex-wrap:wrap}
        .param{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 16px}
        .pk{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:1px;color:#5e9aaa;margin-bottom:2px}
        .pv{font-size:.95rem;font-weight:600;color:#00e5ff}
        .nlist,.tlist{list-style:none;display:flex;flex-direction:column;gap:8px;padding:0}
        .nlist li{padding-left:22px;position:relative;color:#b0d4df;font-size:.9rem;line-height:1.5}
        .nlist li::before{content:"⚠";position:absolute;left:0;color:#ffd166}
        .tlist li{padding-left:22px;position:relative;color:#b0d4df;font-size:.9rem;line-height:1.5}
        .tlist li::before{content:"→";position:absolute;left:0;color:#06d6a0;font-weight:700}
        .tips-blk{background:rgba(6,214,160,.04);border-top:1px solid rgba(6,214,160,.1);margin-top:20px;padding:20px 28px}
        @media(max-width:500px){
          .cat-grid{grid-template-columns:repeat(2,1fr)}
          .logo-t{font-size:2rem}
          .prev-acts{flex-direction:column}
          .rhdr{padding:20px}
          .sgrid{grid-template-columns:1fr 1fr}
        }
      `}</style>
      <div className="app">
        <div className="orbs">
          <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>
        </div>
        <div className="wrap">
          <header className="hdr">
            <div className="logo">
              <span className="logo-ico">🐠</span>
              <div>
                <div className="logo-t">AquaScan</div>
                <div className="logo-s">Aquarium Intelligence Scanner</div>
              </div>
            </div>
            <p className="hdr-desc">Scan plants, fish, driftwood & substrate — get instant expert aquarium insights</p>
          </header>

          <div className="sec">
            <label className="sec-lbl">What are you scanning?</label>
            <div className="cat-grid">
              {(Object.keys(categoryLabels) as ScanCategory[]).map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`cat-btn${category === cat ? " act" : ""}`}>
                  <span className="cat-ico">{categoryIcons[cat]}</span>
                  <span>{categoryLabels[cat]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sec">
            <label className="sec-lbl">Upload Image</label>
            {!selectedImage ? (
              <div className={`drop${dragOver ? " dov" : ""}`}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}>
                <div className="drop-ico">📷</div>
                <div className="drop-t">Drop your image here</div>
                <div className="drop-s">or click to browse · JPG, PNG, WEBP</div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div>
                <div className="prev-wrap">
                  <img src={selectedImage} alt="Preview" className="prev-img" />
                  <div className="prev-badge">{categoryIcons[category]} {categoryLabels[category]}</div>
                </div>
                <div className="prev-acts">
                  <button className="btn-p" onClick={handleScan} disabled={loading}>
                    {loading ? <><span className="spin"/>Analyzing...</> : "🔬 Scan Now"}
                  </button>
                  <button className="btn-g" onClick={reset} disabled={loading}>↩ Change Image</button>
                </div>
              </div>
            )}
          </div>

          {error && <div className="err">⚠️ {error}</div>}

          {loading && (
            <div className="shim">
              {[40,70,55,80].map((w,i) => <div key={i} className="shim-r" style={{width:`${w}%`}}/>)}
            </div>
          )}

          {result && !loading && <ResultCard result={result} />}

          <footer className="ftr">Powered by Claude Vision AI · Built for aquarium enthusiasts 🐠</footer>
        </div>
      </div>
    </>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const suit = suitabilityConfig[result.aquariumSuitability];
  return (
    <div className="rcard">
      <div className="rhdr">
        <span className="rico">{categoryIcons[result.category]}</span>
        <div>
          <div className="rcat">{categoryLabels[result.category]}</div>
          <div className="rname">{result.name}</div>
          {result.scientificName && <div className="rsci">{result.scientificName}</div>}
        </div>
      </div>

      <div className="suit" style={{background:suit.bg,borderColor:suit.color+"44"}}>
        <div>
          <span className="suit-lbl" style={{color:suit.color}}>Aquarium Suitability: {suit.label}</span>
          <p className="suit-r">{result.suitabilityReason}</p>
        </div>
        <div className="suit-dot" style={{background:suit.color,boxShadow:`0 0 8px ${suit.color}`}}/>
      </div>

      <div className="iblk" style={{marginTop:20}}>
        <div className="iblk-t">📖 Overview</div>
        <p className="desc">{result.description}</p>
      </div>

      {result.co2Required !== undefined && (
        <div className={`co2b ${result.co2Required ? "co2-yes" : "co2-no"}`}>
          <span className="co2-ico">{result.co2Required ? "💨" : "✅"}</span>
          <div>
            <div className="co2-lbl">CO₂ Injection: <strong>{result.co2Required ? "Required" : "Not Required"}</strong></div>
            {result.co2Notes && <p className="co2-n">{result.co2Notes}</p>}
          </div>
        </div>
      )}

      <div className="sgrid">
        {result.lightingNeeds && <Stat icon="💡" label="Lighting" value={result.lightingNeeds}/>}
        {result.careLevel && <Stat icon="🎯" label="Care Level" value={result.careLevel}/>}
        {result.growthRate && <Stat icon="📈" label="Growth Rate" value={result.growthRate}/>}
        {result.size && <Stat icon="📏" label="Size" value={result.size}/>}
        {result.origin && <Stat icon="🌍" label="Origin" value={result.origin}/>}
        {result.tankSize && <Stat icon="🪣" label="Min Tank" value={result.tankSize}/>}
        {result.diet && <Stat icon="🍽️" label="Diet" value={result.diet}/>}
        {result.behavior && <Stat icon="🤝" label="Behavior" value={result.behavior}/>}
        {result.compatibility && <Stat icon="♻️" label="Compatibility" value={result.compatibility}/>}
      </div>

      {result.waterParameters && (
        <div className="iblk" style={{marginTop:20}}>
          <div className="iblk-t">💧 Water Parameters</div>
          <div className="params">
            {result.waterParameters.ph && <div className="param"><span className="pk">pH</span><span className="pv">{result.waterParameters.ph}</span></div>}
            {result.waterParameters.temperature && <div className="param"><span className="pk">Temperature</span><span className="pv">{result.waterParameters.temperature}</span></div>}
            {result.waterParameters.hardness && <div className="param"><span className="pk">Hardness</span><span className="pv">{result.waterParameters.hardness}</span></div>}
          </div>
        </div>
      )}

      {result.specialNotes && result.specialNotes.length > 0 && (
        <div className="iblk" style={{marginTop:20}}>
          <div className="iblk-t">⚠️ Special Notes</div>
          <ul className="nlist">{result.specialNotes.map((n,i) => <li key={i}>{n}</li>)}</ul>
        </div>
      )}

      {result.tips && result.tips.length > 0 && (
        <div className="tips-blk">
          <div className="iblk-t">💡 Pro Tips</div>
          <ul className="tlist">{result.tips.map((t,i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="sbox">
      <span className="sico">{icon}</span>
      <div><div className="slbl">{label}</div><div className="sval">{value}</div></div>
    </div>
  );
}
