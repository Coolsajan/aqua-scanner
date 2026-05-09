"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import AuthButton from "../components/AuthButton";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import "../globals.css";

const COMMON_SYMPTOMS = [
  "White spots (Ich)",
  "Lethargic / Inactive",
  "Loss of appetite",
  "Frayed or clamped fins",
  "Gasping at surface",
  "Swollen belly (Dropsy)",
  "Flashing / Rubbing against objects",
  "Cloudy eyes",
  "Red streaks / Sores",
  "White stringy poop",
  "Rapid breathing",
  "Color loss"
];

interface DiseaseResult {
  condition: string;
  confidence: "High" | "Medium" | "Low";
  reason: string;
  symptomsMatch: string[];
  preventiveMeasures: string[];
  treatment: {
    immediateAction: string;
    medication: string;
    duration: string;
  };
  waterParametersToCheck: string[];
  extraNotes: string[];
}

export default function DiseaseScannerPage() {
  const [img, setImg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptoms, setCustomSymptoms] = useState("");
  const [result, setResult] = useState<DiseaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setFile(f); setResult(null); setError(null);
    const r = new FileReader();
    r.onload = e => setImg(e.target?.result as string);
    r.readAsDataURL(f);
  }, []);

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
    );
  };

  const handleScan = async () => {
    if (!img && selectedSymptoms.length === 0 && !customSymptoms) {
      setError("Please upload an image or provide some symptoms.");
      return;
    }
    setLoading(true); setError(null); setResult(null);
    
    try {
      const payload: any = {
        symptoms: selectedSymptoms,
        customSymptoms,
      };

      if (img && file) {
        payload.image = img.split(",")[1];
        payload.mimeType = file.type;
      }

      const res = await fetch("/api/disease", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Diagnosis failed. Please try again.");
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setResult(data);

      if (user) {
        await supabase.from("user_scans").insert({
          user_id: user.id,
          scan_type: "disease",
          inputs: { symptoms: selectedSymptoms, customSymptoms },
          results: data
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  const reset = () => { setImg(null); setFile(null); setResult(null); setError(null); };

  return (
    <>
      <style>{`
        .sc-wrap{max-width:680px;margin:0 auto;padding:32px 16px 80px;width:100%;}
        .sc-hero{text-align:center;margin-bottom:32px;padding:0 4px;}
        .sc-title{font-size:clamp(1.9rem,7vw,2.6rem);font-weight:800;background:linear-gradient(135deg,#ff4d6d,#ffb703);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-1px;margin-bottom:8px;line-height:1.1;}
        .sc-sub{color:#a47c84;font-size:clamp(0.82rem,3.5vw,0.94rem);line-height:1.6;}
        
        .fsec{background:rgba(255,255,255,.025);border:1px solid rgba(255,77,109,.14);border-radius:18px;padding:20px 18px;margin-bottom:16px;}
        .fsec-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#ff4d6d;font-family:var(--font-mono);margin-bottom:18px;display:flex;align-items:center;gap:8px;}
        
        .chips{display:flex;flex-wrap:wrap;gap:8px;}
        .chip{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.08);border-radius:20px;padding:8px 14px;cursor:pointer;font-size:0.8rem;font-weight:600;color:#c0a1a8;transition:all .2s;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        .chip:hover,.chip:active{border-color:rgba(255,77,109,.4);color:#ffccd5;}
        .chip.act{background:rgba(255,77,109,.15);border-color:#ff4d6d;color:#ffccd5;box-shadow:0 0 12px rgba(255,77,109,.2);}

        .finput{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.09);border-radius:12px;color:#e8f4f0;font-family:var(--font-display);font-size:0.9rem;padding:13px 14px;transition:border-color .2s;outline:none;width:100%;-webkit-appearance:none;appearance:none;}
        .finput:focus{border-color:rgba(255,77,109,.5);background:rgba(255,77,109,.06);}

        .drop{border:2px dashed rgba(255,77,109,.28);border-radius:18px;padding:40px 20px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,77,109,.03);-webkit-tap-highlight-color:transparent;}
        .drop.dov{border-color:#ff4d6d;background:rgba(255,77,109,.08);}
        .drop-ico{font-size:2.8rem;margin-bottom:12px;}
        .drop-t{font-size:1rem;font-weight:700;color:#ffccd5;margin-bottom:6px;}
        .drop-s{font-size:0.78rem;color:#a47c84;font-family:var(--font-mono);}

        .prev-box{position:relative;border-radius:14px;overflow:hidden;border:1.5px solid rgba(255,77,109,.22);margin-bottom:10px;}
        .prev-img{width:100%;max-height:300px;object-fit:cover;display:block;}
        .prev-acts{display:flex;gap:8px;}

        /* Result */
        .rcard{background:rgba(255,255,255,.025);border:1px solid rgba(255,77,109,.18);border-radius:18px;overflow:hidden;margin-top:24px;animation:fadeUp .4s ease;}
        .rhdr{display:flex;align-items:flex-start;gap:14px;padding:20px 18px 16px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,77,109,.05);}
        .rico{font-size:2.8rem;line-height:1;flex-shrink:0;}
        .rcat{font-size:0.65rem;text-transform:uppercase;letter-spacing:2px;color:#ff4d6d;font-weight:700;font-family:var(--font-mono);margin-bottom:4px;}
        .rname{font-size:clamp(1.4rem,5vw,1.8rem);font-weight:800;color:#ffccd5;letter-spacing:-.3px;margin-bottom:2px;line-height:1.2;}
        .rsci{color:#a47c84;font-size:0.85rem;}
        
        .conf-badge{display:inline-block;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:700;font-family:var(--font-mono);margin-top:8px;}
        .conf-High{background:rgba(6,214,160,.15);color:#06d6a0;border:1px solid rgba(6,214,160,.3);}
        .conf-Medium{background:rgba(255,209,102,.15);color:#ffd166;border:1px solid rgba(255,209,102,.3);}
        .conf-Low{background:rgba(255,77,109,.15);color:#ff4d6d;border:1px solid rgba(255,77,109,.3);}

        .iblk{padding:16px 18px 0;}
        .iblk-t{font-size:0.67rem;text-transform:uppercase;letter-spacing:2px;color:#ffb703;font-weight:700;font-family:var(--font-mono);margin-bottom:8px;}
        .desc-t{color:#e0c3c8;line-height:1.7;font-size:0.88rem;}

        .treat-box{margin:14px 14px 0;background:rgba(255,77,109,.05);border:1px solid rgba(255,77,109,.2);border-radius:12px;padding:16px;}
        .treat-t{font-size:0.75rem;text-transform:uppercase;letter-spacing:1.5px;color:#ff4d6d;font-weight:700;font-family:var(--font-mono);margin-bottom:12px;display:flex;align-items:center;gap:6px;}
        .treat-grid{display:grid;gap:12px;}
        .treat-item{background:rgba(0,0,0,.2);padding:10px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.05);}
        .treat-lbl{font-size:0.65rem;color:#a47c84;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
        .treat-val{font-size:0.88rem;color:#ffccd5;font-weight:600;}

        .tlist{list-style:none;display:flex;flex-direction:column;gap:7px;}
        .tlist li{padding-left:20px;position:relative;color:#e0c3c8;font-size:0.85rem;line-height:1.55;}
        .tlist li::before{content:"✦";position:absolute;left:0;color:#ffb703;}
        
        .warnlist{list-style:none;display:flex;flex-direction:column;gap:7px;}
        .warnlist li{padding-left:22px;position:relative;color:#ffccd5;font-size:0.85rem;line-height:1.55;}
        .warnlist li::before{content:"⚠️";position:absolute;left:0;font-size:0.8rem;top:2px;}

        .btn-doc{background:linear-gradient(135deg,#ff4d6d,#ffb703);border:none;border-radius:14px;color:#040d14;font-family:var(--font-display);font-weight:800;font-size:1rem;padding:16px 24px;cursor:pointer;transition:all .2s;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;}
        .btn-doc:hover:not(:disabled){opacity:.9;transform:translateY(-1px);}
        .btn-doc:disabled{opacity:.5;cursor:not-allowed;}
      `}</style>

      <nav className="nav">
        <a className="nav-logo" href="/"><span className="nav-logo-icon">🐠</span><span className="nav-logo-text">AquaScan</span></a>
        <div className="nav-tabs">
          <Link href="/" className="nav-tab">🔬 <span className="tab-label">Scanner</span></Link>
          <Link href="/designer" className="nav-tab">🎨 <span className="tab-label">Designer</span></Link>
          <Link href="/disease" className="nav-tab active">🩺 <span className="tab-label">Doctor</span></Link>
        </div>
        <AuthButton />
      </nav>
      <div className="orbs">
        <div className="orb" style={{ width: 400, height: 400, background: "#ff4d6d", top: -120, left: -120 }} />
        <div className="orb" style={{ width: 350, height: 350, background: "#ffb703", bottom: -80, right: -80 }} />
      </div>

      <div className="page">
        <div className="sc-wrap">
          <div className="sc-hero">
            <div className="sc-title">Aqua Doctor</div>
            <p className="sc-sub">AI-powered diagnosis for fish diseases, parasites, and environmental stress.</p>
          </div>

          <div className="fsec">
            <div className="fsec-title">1. Observe Symptoms</div>
            <div className="chips" style={{ marginBottom: 16 }}>
              {COMMON_SYMPTOMS.map(s => (
                <button key={s} onClick={() => toggleSymptom(s)} className={`chip${selectedSymptoms.includes(s) ? " act" : ""}`}>
                  {s}
                </button>
              ))}
            </div>
            <label style={{ fontSize: "0.75rem", color: "#a47c84", marginBottom: "8px", display: "block" }}>Other symptoms or context (optional)</label>
            <textarea 
              className="finput" 
              rows={3} 
              placeholder="e.g. Added new fish yesterday, pH seems slightly high..." 
              value={customSymptoms} 
              onChange={e => setCustomSymptoms(e.target.value)} 
              style={{ resize: "vertical" }}
            />
          </div>

          <div className="fsec">
            <div className="fsec-title">2. Upload Photo (Optional but recommended)</div>
            {!img ? (
              <div className={`drop${dragOver ? " dov" : ""}`}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()}>
                <div className="drop-ico">📸</div>
                <div className="drop-t">Tap to upload a clear photo of the sick fish</div>
                <div className="drop-s">JPG · PNG · WEBP</div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            ) : (
              <div>
                <div className="prev-box">
                  <img src={img} alt="Preview" className="prev-img" />
                </div>
                <button className="btn-ghost" onClick={() => { setImg(null); setFile(null); }} disabled={loading}>↩ Remove Photo</button>
              </div>
            )}
          </div>

          {error && <div className="err-box" style={{ marginTop: 14 }}>⚠️ {error}</div>}
          
          <div style={{ marginTop: 24 }}>
            <button className="btn-doc" onClick={handleScan} disabled={loading}>
              {loading ? <><span className="spin" />&nbsp;Diagnosing...</> : "🩺 Get AI Diagnosis"}
            </button>
          </div>

          {loading && <div className="shimmer-card" style={{ marginTop: 24 }}>{[40, 70, 55, 80].map((w, i) => <div key={i} className="shimmer-row" style={{ width: `${w}%` }} />)}</div>}
          
          {result && !loading && <ResultCard r={result} />}
        </div>
      </div>
    </>
  );
}

function ResultCard({ r }: { r: DiseaseResult }) {
  return (
    <div className="rcard">
      <div className="rhdr">
        <span className="rico">🩺</span>
        <div>
          <div className="rcat">Diagnosis Result</div>
          <div className="rname">{r.condition}</div>
          <div className={`conf-badge conf-${r.confidence}`}>
            Confidence: {r.confidence}
          </div>
        </div>
      </div>
      
      <div className="iblk">
        <div className="iblk-t">📝 Analysis</div>
        <p className="desc-t">{r.reason}</p>
      </div>

      {r.treatment && (
        <div className="treat-box">
          <div className="treat-t">🚑 Recommended Treatment</div>
          <div className="treat-grid">
            <div className="treat-item">
              <div className="treat-lbl">Immediate Action</div>
              <div className="treat-val">{r.treatment.immediateAction}</div>
            </div>
            <div className="treat-item">
              <div className="treat-lbl">Medication / Remedy</div>
              <div className="treat-val">{r.treatment.medication}</div>
            </div>
            <div className="treat-item">
              <div className="treat-lbl">Duration</div>
              <div className="treat-val">{r.treatment.duration}</div>
            </div>
          </div>
        </div>
      )}

      {r.preventiveMeasures && r.preventiveMeasures.length > 0 && (
        <div className="iblk" style={{ marginTop: 8 }}>
          <div className="iblk-t">🛡️ Preventive Measures</div>
          <ul className="tlist">
            {r.preventiveMeasures.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      {r.waterParametersToCheck && r.waterParametersToCheck.length > 0 && (
        <div className="iblk" style={{ marginTop: 8 }}>
          <div className="iblk-t">💧 Parameters to Check</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {r.waterParametersToCheck.map((p, i) => (
              <span key={i} style={{ background: "rgba(0,180,216,.1)", border: "1px solid rgba(0,180,216,.3)", color: "#00e5ff", padding: "4px 12px", borderRadius: "16px", fontSize: "0.75rem", fontWeight: 600 }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.extraNotes && r.extraNotes.length > 0 && (
        <div className="iblk" style={{ marginTop: 16, marginBottom: 20, background: "rgba(255,183,3,.05)", padding: "16px", borderTop: "1px solid rgba(255,183,3,.1)" }}>
          <div className="iblk-t" style={{ color: "#ffb703" }}>⚠️ Important Notes</div>
          <ul className="warnlist">
            {r.extraNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
