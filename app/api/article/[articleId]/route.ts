import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    articleId: string;
  }>;
};

export async function GET(
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

    const article = await prisma.article.findFirst({
      where: {
        id: articleId,
        userId,
      },
      include: {
        quizzes: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            questions: {
              orderBy: {
                order: "asc",
              },
            },
          },
        },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error("GET ARTICLE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to get article" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await prisma.article.delete({
      where: {
        id: articleId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE ARTICLE ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete article" },
      { status: 500 }
    );
  }
}