import { NextRequest, NextResponse } from "next/server";

const DESIGN_SYSTEM_PROMPT = `You are AquaDesign — the world's most knowledgeable aquarium design AI. You create beautiful, detailed, and practical aquarium design plans for hobbyists.

Given tank parameters, you MUST return EXACTLY 4 distinct design ideas as a JSON object.

Return ONLY valid JSON — no markdown fences, no explanation, no preamble. Start directly with { and end with }.

The JSON must match this structure exactly:
{
  "designs": [
    {
      "title": "Catchy design name (2-4 words)",
      "tagline": "One evocative sentence describing the vibe",
      "theme": "Theme e.g. Iwagumi, Biotope, Dutch, Jungle, Blackwater",
      "difficulty": "Beginner",
      "budgetMatch": "Budget-friendly",
      "estimatedCost": "$200–$350",
      "imagePrompt": "photorealistic aquarium tank, lush aquascape with java fern and anubias, mopani driftwood centerpiece, school of neon tetras swimming, crystal clear water, dramatic underwater lighting, soft caustic light rays, professional aquarium photography, vibrant greens, 8k detail",
      "stockingList": [
        { "name": "Neon Tetra", "qty": "20", "role": "Schooling fish / color accent" },
        { "name": "Corydoras Sterbai", "qty": "6", "role": "Bottom dweller / cleanup crew" }
      ],
      "plantList": [
        { "name": "Java Fern", "zone": "Background", "qty": "5 pots" },
        { "name": "Anubias Nana", "zone": "Midground", "qty": "3 pots" },
        { "name": "Dwarf Hairgrass", "zone": "Foreground", "qty": "4 pots" }
      ],
      "hardscape": ["Mopani driftwood x2", "Seiryu stone x3"],
      "filtrationRec": "Canister filter rated 4-5x tank volume turnover",
      "lightingRec": "Full spectrum LED, 6500K, 8 hours photoperiod",
      "co2Rec": "Not required — plants selected for low-tech",
      "substrate": "Fine gravel or sand, 5–7cm depth",
      "waterParams": { "ph": "6.5–7.0", "temp": "24–26°C", "hardness": "Soft (2–8 dGH)" },
      "layoutDescription": "Vivid 3-4 sentence description of the design: where hardscape sits, how plants are arranged front-to-back, open swimming space, and the overall mood this creates.",
      "topDownLayout": [
        ["🌿","🌿","🪵","🪵","🌿","🌿","🌿","🌿","🌿","🌿"],
        ["🌿","🪵","🪵","🌿","💧","💧","💧","🌿","🌿","🌿"],
        ["🌿","🌿","🌿","💧","💧","🐟","🐟","💧","🌿","🌿"],
        ["🌱","🌱","💧","💧","🐟","🐟","🐟","💧","🌱","🌱"],
        ["🌱","🌱","🌱","🌱","💧","💧","🌱","🌱","🌱","🌱"],
        ["🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱"]
      ],
      "maintenanceSchedule": [
        { "frequency": "Daily", "tasks": ["Check fish health and behavior", "Top off evaporation"] },
        { "frequency": "Weekly", "tasks": ["25–30% water change", "Trim fast-growing plants", "Wipe algae from glass"] },
        { "frequency": "Monthly", "tasks": ["Deep gravel vacuum", "Inspect and clean filter media", "Dose liquid fertilizer"] }
      ],
      "setupTimeline": [
        { "week": "Day 1", "task": "Rinse substrate, place hardscape, fill tank, start filter" },
        { "week": "Week 1–2", "task": "Add plants, begin fishless cycle with ammonia source" },
        { "week": "Week 3–5", "task": "Monitor ammonia and nitrite daily, cycle progressing" },
        { "week": "Week 6", "task": "Cycle complete — add first 30% of fish, observe for 1 week" },
        { "week": "Week 7+", "task": "Gradually add remaining livestock over the next few weeks" }
      ],
      "pros": ["Beginner friendly", "Low maintenance", "Visually striking year-round"],
      "cons": ["Slower plant growth without CO2", "Limited high-light plant options"],
      "compatibilityNotes": "All species are peaceful and compatible. Avoid fin-nippers. Corydoras prefer groups of 6+."
    }
  ]
}

CRITICAL RULES for imagePrompt:
- Write it as a direct Stable Diffusion / Flux image prompt (comma-separated descriptors)
- Be VERY specific about the exact plants, fish, and hardscape in THIS design
- Always include: "photorealistic aquarium", "crystal clear water", "professional aquarium photography", "underwater lighting", "8k detail"  
- Make each of the 4 imagePrompts completely different and specific to that design's species and style
- Example good prompt: "photorealistic planted aquarium tank, dense jungle of amazon sword and rotala, large piece of spider wood covered in java moss, school of cardinal tetras, corydoras on sandy bottom, blackwater tint, dramatic side lighting, caustic light rays, lush green underwater photography, 8k"

RULES for topDownLayout:
- Grid must be 6 rows × 10 columns minimum
- Use ONLY: 🌿 (stem/tall plants), 🪨 (rock), 🪵 (driftwood), 🐟 (open swim zone), 🌱 (carpet/foreground), 💧 (open water), 🏔️ (rock pile), ⬜ (sand), 🌾 (grass stems)
- Background plants (🌿🌾) at TOP rows, carpet (🌱) at BOTTOM rows, swimming space (🐟💧) in MIDDLE
- Each design must have a unique, distinct layout arrangement

RULES for designs:
- All 4 designs must be genuinely distinct — different styles, species, difficulty levels
- Scale stocking quantities to the actual tank volume
- Respect the user's stated budget, experience level, CO2 preference, filtration type
- If buildMode is "existing": work around their existing equipment shown in photos
- If buildMode is "new": recommend ideal gear for their budget
- All species within each design must be compatible with each other
- estimatedCost must match the user's budget range`;

export async function POST(req: NextRequest) {
  const { form, propImages, volume } = await req.json();

  const dims = `${form.length}×${form.width}×${form.height}${form.unit}`;
  const vol = volume ? `~${volume} liters` : "unknown volume";

  let userPrompt = `Create 4 aquarium design ideas for this tank:

DIMENSIONS: ${dims} (${vol}), ${form.shape} shape
ECOSYSTEM TYPE: ${form.ecosystem}
AESTHETIC STYLE: ${form.style}
FISH WANTED: ${form.fishWanted || "surprise me with great choices"}
FISH COUNT: ${form.fishCount || "appropriate for tank size"}
CENTERPIECE FISH: ${form.hasCenterpiece || "no preference"}
LIVE PLANTS: ${form.wantsPlants}
HARDSCAPE: ${form.wantsHardscape}
FILTRATION: ${form.filtration}
CO2 SYSTEM: ${form.co2}
LIGHTING: ${form.lighting} — budget: ${form.lightingBudget}
HOBBYIST EXPERIENCE: ${form.experience}
TOTAL BUDGET: ${form.budget}
MAINTENANCE AVAILABILITY: ${form.maintenanceTime}
BUILD MODE: ${form.buildMode === "existing" ? "Design AROUND the user's existing props/equipment in photos" : "Fresh recommendations within budget"}
${form.propsDescription ? `EXTRA NOTES FROM USER: ${form.propsDescription}` : ""}

IMPORTANT: Return ONLY the raw JSON object. No markdown. No explanation. Start with { immediately.`;

  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const contentBlocks: ContentBlock[] = [];

  if (propImages && propImages.length > 0) {
    propImages.slice(0, 4).forEach((img: { mime: string; base64: string; name: string }) => {
      contentBlocks.push({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${img.base64}` },
      });
    });
    userPrompt += `\n\n${propImages.length} prop/inspiration image(s) uploaded above — incorporate these into the designs.`;
  }

  contentBlocks.push({ type: "text", text: userPrompt });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 6000,
      temperature: 0.65,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DESIGN_SYSTEM_PROMPT },
        { role: "user", content: contentBlocks },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Groq API error:", err);
    return NextResponse.json({ error: "AI design generation failed. Check your GROQ_API_KEY in Vercel environment variables." }, { status: 500 });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object in response");
    const parsed = JSON.parse(clean.slice(start, end + 1));

    // Validate and clean imagePrompts — ensure they're proper Pollinations prompts
    if (parsed.designs) {
      parsed.designs = parsed.designs.map((d: Record<string, unknown>, i: number) => {
        if (!d.imagePrompt || typeof d.imagePrompt !== "string" || d.imagePrompt.length < 30) {
          // Build a fallback prompt from the design details
          const plants = Array.isArray(d.plantList) ? (d.plantList as {name:string}[]).slice(0,3).map((p) => p.name).join(", ") : "aquatic plants";
          const fish = Array.isArray(d.stockingList) ? (d.stockingList as {name:string}[]).slice(0,2).map((f) => f.name).join(", ") : "tropical fish";
          const hw = Array.isArray(d.hardscape) ? (d.hardscape as string[])[0] || "driftwood" : "driftwood";
          d.imagePrompt = `photorealistic planted aquarium tank, ${plants}, ${hw}, school of ${fish}, crystal clear water, dramatic underwater lighting, soft caustic rays, lush aquascape photography, vibrant colors, 8k detail, design number ${i + 1}`;
        }
        return d;
      });
    }

    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", e, "\nRaw:", text.slice(0, 800));
    return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
  }
}
