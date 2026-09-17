import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";

type RouteContext = {
  params: Promise<{
    articleId: string;
  }>;
};

type GeneratedQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { articleId } = await context.params;

    // 1. Article авах
    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        userId,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    // 2. Gemini-ээр quiz үүсгэх
    const response = await gemini.models.generateContent({
      model: "gemini-3.6-flash",

      contents: `
Create exactly 5 multiple-choice quiz questions
based ONLY on the following article summary.

RULES:
- Create exactly 5 questions.
- Each question must have exactly 4 options.
- Only one option is correct.
- Do not create duplicate questions.
- Use the same language as the article summary.
- correctAnswer must exactly match one of the options.

Return ONLY valid JSON.

Use exactly this JSON format:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option 1",
        "Option 2",
        "Option 3",
        "Option 4"
      ],
      "correctAnswer": "Option 1"
    }
  ]
}

ARTICLE TITLE:
${article.title}

ARTICLE SUMMARY:
${article.summary}
`,

      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned empty response");
    }

    // 3. Gemini JSON цэвэрлэх
    const cleanedText = response.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    const generatedQuestions: GeneratedQuestion[] =
      Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.questions)
          ? parsed.questions
          : [];

    // 4. Validation
    const validQuestions = generatedQuestions
      .filter((item) => {
        if (!item) return false;

        if (
          typeof item.question !== "string" ||
          !item.question.trim()
        ) {
          return false;
        }

        if (
          !Array.isArray(item.options) ||
          item.options.length !== 4
        ) {
          return false;
        }

        if (
          item.options.some(
            (option) => typeof option !== "string"
          )
        ) {
          return false;
        }

        if (
          typeof item.correctAnswer !== "string"
        ) {
          return false;
        }

        if (
          !item.options.includes(item.correctAnswer)
        ) {
          return false;
        }

        return true;
      })
      .slice(0, 5);

    if (validQuestions.length !== 5) {
      console.error(
        "INVALID GEMINI QUIZ:",
        generatedQuestions
      );

      throw new Error(
        "Gemini did not return exactly 5 valid questions"
      );
    }

    // 5. PostgreSQL-д quiz хадгалах
    const quiz = await prisma.quiz.create({
      data: {
        articleId,

        questions: {
          create: validQuestions.map(
            (item, index) => ({
              question: item.question.trim(),

              options: item.options.map(
                (option) => option.trim()
              ),

              correctAnswer:
                item.correctAnswer.trim(),

              order: index + 1,
            })
          ),
        },
      },

      include: {
        questions: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    // 6. Frontend рүү буцаах
    return NextResponse.json(
      quiz,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "GENERATE QUIZ ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to generate quiz",
      },
      {
        status: 500,
      }
    );
  }
}