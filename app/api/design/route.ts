import { NextRequest, NextResponse } from "next/server";

const DESIGN_SYSTEM_PROMPT = `You are AquaDesign — the world's most knowledgeable aquarium design AI. You create beautiful, detailed, and practical aquarium design plans for hobbyists.

Given tank parameters, you MUST return EXACTLY 4 distinct design ideas as a JSON object.

Return ONLY this JSON structure, nothing else:
{
  "designs": [
    {
      "title": "Catchy design name",
      "tagline": "One evocative sentence describing the vibe",
      "theme": "Theme category e.g. Iwagumi, Biotope, Dutch, Jungle",
      "difficulty": "Beginner / Intermediate / Advanced / Expert",
      "budgetMatch": "Budget-friendly / Mid-range / Premium / Luxury",
      "estimatedCost": "$X–$Y total setup estimate",
      "stockingList": [
        { "name": "Neon Tetra", "qty": "20", "role": "Schooling fish / color accent" }
      ],
      "plantList": [
        { "name": "Java Fern", "zone": "Background", "qty": "5 pots" }
      ],
      "hardscape": ["Mopani driftwood", "Seiryu stone"],
      "filtrationRec": "Specific filter recommendation with model type and turnover rate",
      "lightingRec": "Specific lighting recommendation",
      "co2Rec": "CO2 recommendation",
      "substrate": "Substrate recommendation",
      "waterParams": {
        "ph": "6.5–7.0",
        "temp": "24–26°C",
        "hardness": "Soft (2–8 dGH)"
      },
      "layoutDescription": "Vivid 3-4 sentence description of the design vision and layout — where plants go, how hardscape is arranged, the overall aesthetic feeling",
      "topDownLayout": [
        ["🌿","🌿","🪵","🌿","🌿","🌿","🌿","🌿","🌿","🌿"],
        ["🌿","🪵","🪵","🌿","💧","💧","💧","🌱","🌱","🌿"],
        ["🪵","🪵","🌿","💧","💧","🐟","🐟","💧","🌱","🌱"],
        ["🌿","🌿","💧","💧","🐟","🐟","🐟","💧","🌱","🌱"],
        ["🌱","🌱","🌱","💧","💧","💧","💧","🌱","🌱","🌱"],
        ["🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱","🌱"]
      ],
      "maintenanceSchedule": [
        { "frequency": "Daily", "tasks": ["Check fish health", "Top off evaporation"] },
        { "frequency": "Weekly", "tasks": ["30% water change", "Trim fast-growing plants", "Clean filter intake"] },
        { "frequency": "Monthly", "tasks": ["Deep substrate vacuum", "Check/replace filter media", "Fertilizer dose"] }
      ],
      "setupTimeline": [
        { "week": "Week 1", "task": "Set up hardscape, add substrate, fill tank, start filter cycle" },
        { "week": "Week 2–3", "task": "Add plants, begin dosing ammonia for fishless cycle" },
        { "week": "Week 4–6", "task": "Monitor ammonia/nitrite levels, complete nitrogen cycle" },
        { "week": "Week 6–8", "task": "Add first fish (hardy species first), observe behavior" },
        { "week": "Week 8+", "task": "Add remaining livestock gradually over several weeks" }
      ],
      "pros": ["Great for beginners", "Low maintenance", "Visually striking"],
      "cons": ["Slower plant growth without CO2", "Limited plant species options"],
      "compatibilityNotes": "All species listed are compatible. Avoid keeping with fin-nipping species. Corydoras are sensitive to salt."
    }
  ]
}

RULES for topDownLayout:
- Use a grid of at least 6 rows × 10 columns (can be larger for bigger tanks)
- Use ONLY these emojis as cells: 🌿 (plants/stems), 🪨 (rock/stone), 🪵 (driftwood), 🐟 (open swimming area), 🌱 (carpet/foreground plants), 💧 (open water), 🏔️ (mountain stone/rock pile), ⬜ (sand/open substrate), 🌾 (grass/stem plants)
- The layout must realistically represent the design: background plants at top, midground in middle, foreground at bottom
- Show interesting hardscape arrangements, open swimming corridors for fish
- Each of the 4 designs must have a COMPLETELY DIFFERENT topDownLayout

RULES for designs:
- Make all 4 designs genuinely distinct in style, difficulty, stocking, plants, and approach
- Scale recommendations to the tank dimensions and volume provided
- Respect the user's budget, experience level, filtration preference, and CO2 preference
- If "buildMode" is "existing" and prop images are provided, adapt designs to use those items
- If "buildMode" is "new", recommend fresh/ideal equipment within budget
- stockingList should have realistic quantities for the tank size
- plantList zones: Foreground, Midground, Background, or Floating
- Be specific with equipment — name filter types, wattage, etc.
- estimatedCost should be realistic for the budget range specified
- All species must be compatible with each other within each design`;

export async function POST(req: NextRequest) {
  const { form, propImages, volume } = await req.json();

  // Build the user prompt
  const dims = `${form.length}×${form.width}×${form.height}${form.unit}`;
  const vol = volume ? `~${volume} liters` : "unknown volume";

  let userPrompt = `Design 4 aquarium ideas for this setup:

TANK: ${dims} (${vol}), ${form.shape} shape
ECOSYSTEM: ${form.ecosystem} | STYLE: ${form.style}
FISH WANTED: ${form.fishWanted || "open to suggestions"}
FISH COUNT: ${form.fishCount || "appropriate for tank size"}
CENTERPIECE: ${form.hasCenterpiece || "no preference"}
PLANTS: ${form.wantsPlants} | HARDSCAPE: ${form.wantsHardscape}
FILTRATION: ${form.filtration} | CO2: ${form.co2}
LIGHTING: ${form.lighting} (${form.lightingBudget})
EXPERIENCE: ${form.experience}
BUDGET: ${form.budget}
MAINTENANCE: ${form.maintenanceTime}
BUILD MODE: ${form.buildMode === "existing" ? "Design around existing props/equipment" : "Generate fresh ideas within budget"}
${form.propsDescription ? `EXTRA NOTES: ${form.propsDescription}` : ""}

Return exactly 4 distinct design ideas as JSON. No markdown, no explanation — pure JSON only.`;

  // Build messages array - include images if provided
  type ContentBlock =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const contentBlocks: ContentBlock[] = [];

  if (propImages && propImages.length > 0) {
    propImages.forEach((img: { mime: string; base64: string; name: string }) => {
      contentBlocks.push({
        type: "image_url",
        image_url: { url: `data:${img.mime};base64,${img.base64}` },
      });
    });
    userPrompt += `\n\nThe user has uploaded ${propImages.length} photo(s) of their existing props/equipment/inspiration. Please consider these when designing.`;
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
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        { role: "system", content: DESIGN_SYSTEM_PROMPT },
        { role: "user", content: contentBlocks },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Groq API error:", err);
    return NextResponse.json({ error: "AI design generation failed. Check GROQ_API_KEY." }, { status: 500 });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    // Find the JSON object
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found");
    const jsonStr = clean.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("JSON parse error:", e, "\nRaw text:", text.slice(0, 500));
    return NextResponse.json({ error: "Failed to parse AI design response. Please try again." }, { status: 500 });
  }
}
