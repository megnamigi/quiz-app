-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_userId_idx" ON "Article"("userId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
