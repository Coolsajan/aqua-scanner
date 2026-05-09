import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are AquaScan Doctor — an expert aquatic veterinarian and ichthyologist.
You specialize in diagnosing diseases, parasites, and environmental stress in freshwater and marine aquarium fish.

When given an image of a sick fish and/or a list of observed symptoms, analyze them and return a JSON object with EXACTLY this structure:

{
  "condition": "The name of the disease, parasite, or issue (e.g., Ich, Fin Rot, Ammonia Poisoning)",
  "confidence": "High / Medium / Low",
  "reason": "Detailed explanation of why you suspect this condition based on the visual evidence and provided symptoms (2-3 sentences)",
  "symptomsMatch": ["List of symptoms from the user's input that align with this diagnosis"],
  "preventiveMeasures": ["Practical step 1 to prevent future occurrences", "Practical step 2", "Practical step 3"],
  "treatment": {
    "immediateAction": "What the user should do immediately (e.g., perform a water change, quarantine)",
    "medication": "Suggested medications or treatments (e.g., Copper-based meds, Aquarium salt)",
    "duration": "Typical duration of the treatment"
  },
  "waterParametersToCheck": ["pH", "Ammonia", "Nitrite", "Nitrate", "Temperature"],
  "extraNotes": ["Any secondary infections to look out for", "Warnings about certain medications with scaleless fish or invertebrates"]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown, no explanation before or after.
- If you cannot identify the disease clearly, still return valid JSON with your best assessment, mark confidence as "Low", and provide general triage advice (e.g., check water quality).
- Be accurate, detailed, and compassionate — aquarium hobbyists rely on this to save their pets.
- All fields should have real, useful values. Do not leave fields empty.`;

export async function POST(req: NextRequest) {
  const { image, symptoms, customSymptoms, mimeType } = await req.json();

  if (!image && !symptoms && !customSymptoms) {
    return NextResponse.json({ error: "Missing image or symptoms" }, { status: 400 });
  }

  const validMime = mimeType && ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)
    ? mimeType
    : "image/jpeg";

  // Build the message content based on what the user provided
  const contentArray: any[] = [];
  
  if (image) {
    contentArray.push({
      type: "image_url",
      image_url: {
        url: `data:${validMime};base64,${image}`,
      },
    });
  }

  let textPrompt = `Please analyze the provided information and diagnose the fish.`;
  if (symptoms && symptoms.length > 0) {
    textPrompt += `\nObserved symptoms: ${symptoms.join(", ")}.`;
  }
  if (customSymptoms) {
    textPrompt += `\nAdditional user notes: ${customSymptoms}.`;
  }
  textPrompt += `\nReturn only the JSON object as specified.`;

  contentArray.push({
    type: "text",
    text: textPrompt,
  });

  // Using Groq (free tier) with Llama 4 Scout — excellent vision model, fast, free
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1500,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: contentArray,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Groq API error:", err);
    return NextResponse.json({ error: "AI analysis failed. Check your GROQ_API_KEY." }, { status: 500 });
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch {
    console.error("JSON parse error:", text);
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
