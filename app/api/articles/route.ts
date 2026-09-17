import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/articles
// Нэвтэрсэн хэрэглэгчийн бүх article-ийг авах
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const articles = await prisma.article.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        quizzes: {
          include: {
            questions: true,
          },
        },
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error("GET ARTICLES ERROR:", error);

    return NextResponse.json(
      { error: "Failed to get articles" },
      { status: 500 }
    );
  }
}

// POST /api/articles
// Шинэ article + summary-г database-д хадгалах
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

    const summary =
      typeof body.summary === "string" ? body.summary.trim() : "";

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

    if (!summary) {
      return NextResponse.json(
        { error: "Summary is required." },
        { status: 400 }
      );
    }

    const article = await prisma.article.create({
      data: {
        userId,
        title,
        content,
        summary,
      },
    });

    return NextResponse.json(article, {
      status: 201,
    });
  } catch (error) {
    console.error("CREATE ARTICLE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create article" },
      { status: 500 }
    );
  }
}