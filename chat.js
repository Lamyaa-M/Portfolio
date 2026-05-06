export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY" });
      return;
    }

    const { question, lang, context } = req.body || {};
    const q = typeof question === "string" ? question.trim() : "";
    if (!q) {
      res.status(400).json({ error: "Missing question" });
      return;
    }

    const safeLang = lang === "en" ? "en" : "fr";
    const ctx =
      typeof context === "string"
        ? context.slice(0, 14000)
        : JSON.stringify(context || {}, null, 0).slice(0, 14000);

    const system = safeLang === "en"
      ? "You are a helpful assistant for a personal portfolio website. Answer ONLY using the provided portfolio context. If the answer isn't in the context, say you don't know and suggest checking the relevant section (Projects / About / Contact). Keep it concise and professional."
      : "Vous êtes un assistant utile pour un site portfolio. Répondez UNIQUEMENT à partir du contexte fourni (portfolio). Si l'information n'est pas dans le contexte, dites que vous ne savez pas et proposez de consulter la section concernée (Projets / À propos / Contact). Réponse concise et professionnelle.";

    const user = safeLang === "en"
      ? `PORTFOLIO CONTEXT:\n${ctx}\n\nQUESTION:\n${q}`
      : `CONTEXTE PORTFOLIO:\n${ctx}\n\nQUESTION:\n${q}`;

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 300,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      res.status(502).json({ error: "Upstream error", details: data });
      return;
    }

    const text = data?.choices?.[0]?.message?.content?.trim() || "";
    res.status(200).json({ answer: text || (safeLang === "en" ? "Sorry, I couldn't generate an answer." : "Désolé, je n’ai pas pu générer une réponse.") });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}

