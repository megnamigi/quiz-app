import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { gemini } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (title.length < 3) {
      return NextResponse.json(
        { error: "Title must be at least 3 characters." },
        { status: 400 }
      );
    }

    if (content.length < 20) {
      return NextResponse.json(
        { error: "Article must be at least 20 characters." },
        { status: 400 }
      );
    }

    const prompt = `
Summarize the following article clearly and accurately.

Rules:
- Keep the important facts and main ideas.
- Do not add information that is not in the article.
- Maximum 150 words.
- Write the summary in the same language as the article.
- Return only the summary.

Title:
${title}

Article:
${content}
`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const summary = response.text?.trim();

    if (!summary) {
      return NextResponse.json(
        { error: "Gemini did not generate a summary." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary,
    });
  } catch (error) {
    console.error("GENERATE SUMMARY ERROR:", error);

    return NextResponse.json(
      { error: "Failed to generate summary." },
      { status: 500 }
    );
  }
}