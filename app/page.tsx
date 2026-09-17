"use client";

import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";

type Question = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  order: number;
};

type Quiz = {
  id: string;
  articleId: string;
  questions: Question[];
};

type Article = {
  id: string;
  title: string;
  content: string;
  summary: string;
  createdAt: string;
  quizzes?: Quiz[];
};

type Screen = "article" | "summary" | "quiz" | "result";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("article");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [articles, setArticles] = useState<Article[]>([]);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [titleError, setTitleError] = useState("");
  const [contentError, setContentError] = useState("");
  const [apiError, setApiError] = useState("");

  const [loadingArticles, setLoadingArticles] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );
  const [score, setScore] = useState(0);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadArticles = async () => {
      try {
        const response = await fetch("/api/articles", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load articles");
        }

        if (!cancelled) {
          setArticles(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelled) {
          setLoadingArticles(false);
        }
      }
    };

    void loadArticles();

    return () => {
      cancelled = true;
    };
  }, []);

  const createNewArticle = () => {
    setTitle("");
    setContent("");
    setTitleError("");
    setContentError("");
    setApiError("");
    setCurrentArticle(null);
    setCurrentQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setScore(0);
    setShowCancelModal(false);
    setShowContentModal(false);
    setScreen("article");
  };

  const generateSummary = async () => {
    let hasError = false;

    setTitleError("");
    setContentError("");
    setApiError("");

    if (!title.trim()) {
      setTitleError("Article title is required.");
      hasError = true;
    } else if (title.trim().length < 3) {
      setTitleError("Title must be at least 3 characters.");
      hasError = true;
    }

    if (!content.trim()) {
      setContentError("Article content is required.");
      hasError = true;
    } else if (content.trim().length < 20) {
      setContentError("Content must be at least 20 characters.");
      hasError = true;
    }

    if (hasError) return;

    try {
      setGeneratingSummary(true);

      const generateResponse = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(
          generateData.error || "Failed to generate summary"
        );
      }

      const saveResponse = await fetch("/api/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          summary: generateData.summary,
        }),
      });

      const savedArticle = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(savedArticle.error || "Failed to save article");
      }

      const articleWithQuizzes: Article = {
        ...savedArticle,
        quizzes: savedArticle.quizzes ?? [],
      };

      setCurrentArticle(articleWithQuizzes);
      setCurrentQuiz(null);
      setArticles((previous) => [articleWithQuizzes, ...previous]);
      setScreen("summary");
    } catch (error) {
      console.error(error);
      setApiError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setGeneratingSummary(false);
    }
  };

  const openArticle = async (article: Article) => {
    try {
      setApiError("");

      const response = await fetch(`/api/article/${article.id}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open article");
      }

      setCurrentArticle(data);
      setTitle(data.title);
      setContent(data.content);

      setCurrentQuiz(data.quizzes?.length ? data.quizzes[0] : null);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setScore(0);
      setScreen("summary");
    } catch (error) {
      console.error(error);
      setApiError(
        error instanceof Error ? error.message : "Failed to open article"
      );
    }
  };

  const startQuiz = async () => {
    if (!currentArticle) return;

    if (currentQuiz?.questions?.length) {
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setScore(0);
      setScreen("quiz");
      return;
    }

    try {
      setGeneratingQuiz(true);
      setApiError("");

      const response = await fetch(
        `/api/article/${currentArticle.id}/quizzes`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setCurrentQuiz(data);
      setCurrentQuestion(0);
      setSelectedAnswers({});
      setScore(0);
      setScreen("quiz");
    } catch (error) {
      console.error(error);
      setApiError(
        error instanceof Error ? error.message : "Failed to generate quiz"
      );
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const chooseAnswer = (answer: string) => {
    if (!currentQuiz) return;

    const question = currentQuiz.questions[currentQuestion];

    if (selectedAnswers[question.id]) return;

    const nextAnswers = {
      ...selectedAnswers,
      [question.id]: answer,
    };

    setSelectedAnswers(nextAnswers);

    if (answer === question.correctAnswer) {
      setScore((previous) => previous + 1);
    }

    window.setTimeout(() => {
      if (currentQuestion < currentQuiz.questions.length - 1) {
        setCurrentQuestion((previous) => previous + 1);
      } else {
        setScreen("result");
      }
    }, 220);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setScore(0);
    setShowCancelModal(false);
    setScreen("quiz");
  };

  const cancelQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setScore(0);
    setShowCancelModal(false);
    setScreen("summary");
  };

  const saveAndLeave = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setScore(0);
    setScreen("summary");
  };

  const question = currentQuiz?.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#111111]">
      <header className="flex h-[58px] items-center justify-between border-b border-[#e5e7eb] bg-white px-6">
        <button
          type="button"
          onClick={createNewArticle}
          className="text-[20px] font-semibold tracking-[-0.02em]"
        >
          Quiz app
        </button>

        <UserButton />
      </header>

      <div className="flex min-h-[calc(100vh-58px)]">
        <aside
          className={`shrink-0 border-r border-[#e5e7eb] bg-white transition-[width] duration-200 ${
            sidebarOpen ? "w-[280px]" : "w-[72px]"
          }`}
        >
          {sidebarOpen ? (
            <div className="px-5 pt-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-[17px] font-semibold">History</h2>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#9ca3af] bg-white text-sm"
                  aria-label="Close sidebar"
                >
                  ‹
                </button>
              </div>

              {loadingArticles ? (
                <p className="text-sm text-[#6b7280]">Loading...</p>
              ) : articles.length === 0 ? (
                <p className="text-sm text-[#6b7280]">No articles yet</p>
              ) : (
                <div className="space-y-1">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => void openArticle(article)}
                      className="block w-full rounded-md px-0 py-2 text-left text-[15px] leading-5 hover:text-[#6b7280]"
                    >
                      {article.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center pt-6">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#9ca3af] bg-white text-sm"
                aria-label="Open sidebar"
              >
                ‹
              </button>
            </div>
          )}
        </aside>

        <main className="relative flex flex-1 justify-center px-6 py-12">
          <div className="w-full max-w-[760px]">
            {screen !== "quiz" && screen !== "result" && (
              <button
                type="button"
                onClick={() => {
                  if (screen === "summary") {
                    createNewArticle();
                  } else {
                    setSidebarOpen((previous) => !previous);
                  }
                }}
                className="mb-5 flex h-9 w-9 items-center justify-center rounded-md border border-[#e0e0e0] bg-white text-lg"
                aria-label="Back"
              >
                ‹
              </button>
            )}

            {apiError && (
              <div className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {apiError}
              </div>
            )}

            {screen === "article" && (
              <section className="rounded-lg border border-[#dedede] bg-white px-6 py-6">
                <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
                  <span className="text-[27px] font-normal">✧</span>
                  Article Quiz Generator
                </h1>

                <p className="mt-1 max-w-[650px] text-[14px] leading-[19px] text-[#6b7280]">
                  Paste your article below to generate a summarize and quiz
                  question. Your articles will saved in the sidebar for future
                  reference.
                </p>

                <div className="mt-5">
                  <label className="mb-2 block text-[13px] font-medium text-[#666666]">
                    ▤ Article Title
                  </label>

                  <input
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setTitleError("");
                    }}
                    placeholder="Enter a title for your article..."
                    className="h-10 w-full rounded-md border border-[#dedede] px-3 text-[14px] outline-none placeholder:text-[#8a8a8a] focus:border-[#9ca3af]"
                  />

                  {titleError && (
                    <p className="mt-1 text-xs text-red-500">{titleError}</p>
                  )}
                </div>

                <div className="mt-5">
                  <label className="mb-2 block text-[13px] font-medium text-[#666666]">
                    ▤ Article Content
                  </label>

                  <textarea
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      setContentError("");
                    }}
                    rows={7}
                    placeholder="Paste your article content here..."
                    className="w-full resize-none rounded-md border border-[#dedede] px-3 py-3 text-[14px] leading-5 outline-none placeholder:text-[#8a8a8a] focus:border-[#9ca3af]"
                  />

                  {contentError && (
                    <p className="mt-1 text-xs text-red-500">{contentError}</p>
                  )}
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void generateSummary()}
                    disabled={
                      generatingSummary ||
                      title.trim().length < 3 ||
                      content.trim().length < 20
                    }
                    className="rounded-md bg-[#171717] px-5 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#d1d1d1]"
                  >
                    {generatingSummary ? "Generating..." : "Generate summary"}
                  </button>
                </div>
              </section>
            )}

            {screen === "summary" && currentArticle && (
              <section className="rounded-lg border border-[#dedede] bg-white px-6 py-6">
                <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
                  <span className="text-[27px] font-normal">✧</span>
                  Article Quiz Generator
                </h1>

                <p className="mt-4 text-[13px] font-medium text-[#666666]">
                  ▱&nbsp; Summarized content
                </p>

                <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">
                  {currentArticle.title}
                </h2>

                <p className="mt-2 whitespace-pre-line text-[14px] leading-[20px] text-[#202020]">
                  {currentArticle.summary}
                </p>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setShowContentModal(true)}
                    className="rounded-md border border-[#dedede] bg-white px-4 py-2 text-[13px] font-medium"
                  >
                    See content
                  </button>

                  <button
                    type="button"
                    onClick={() => void startQuiz()}
                    disabled={generatingQuiz}
                    className="rounded-md bg-[#171717] px-5 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {generatingQuiz ? "Generating quiz..." : "Take a quiz"}
                  </button>
                </div>
              </section>
            )}

            {screen === "quiz" && currentQuiz && question && (
              <section className="mx-auto mt-10 w-full max-w-[590px]">
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
                      <span className="text-[27px] font-normal">✧</span>
                      Quick test
                    </h1>
                    <p className="mt-1 text-[14px] text-[#6b7280]">
                      Take a quick test about your knowledge from your content
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-[#dedede] bg-white text-lg"
                    aria-label="Cancel quiz"
                  >
                    ×
                  </button>
                </div>

                <div className="rounded-lg border border-[#dedede] bg-white px-6 py-6">
                  <div className="flex items-start justify-between gap-5">
                    <h2 className="text-[18px] font-medium leading-6">
                      {question.question}
                    </h2>

                    <p className="shrink-0 text-[17px]">
                      <span className="font-medium">{currentQuestion + 1}</span>
                      <span className="text-[#6b7280]">
                        {" "}
                        / {currentQuiz.questions.length}
                      </span>
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {question.options.map((answer) => {
                      const selected = selectedAnswers[question.id] === answer;

                      return (
                        <button
                          key={answer}
                          type="button"
                          onClick={() => chooseAnswer(answer)}
                          disabled={Boolean(selectedAnswers[question.id])}
                          className={`min-h-10 rounded-md border px-3 py-2 text-[13px] transition ${
                            selected
                              ? "border-[#111111] bg-[#f3f4f6]"
                              : "border-[#dedede] bg-white hover:bg-[#f8f8f8]"
                          }`}
                        >
                          {answer}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {screen === "result" && currentQuiz && (
              <section className="mx-auto mt-10 w-full max-w-[520px]">
                <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em]">
                  <span className="text-[27px] font-normal">✧</span>
                  Quiz completed
                </h1>

                <p className="mt-1 text-[14px] text-[#6b7280]">
                  Let’s see what you did
                </p>

                <div className="mt-6 rounded-lg border border-[#dedede] bg-white px-6 py-6">
                  <h2 className="text-[21px] font-semibold">
                    Your score: {score}{" "}
                    <span className="font-normal text-[#6b7280]">
                      / {currentQuiz.questions.length}
                    </span>
                  </h2>

                  <div className="mt-6 space-y-5">
                    {currentQuiz.questions.map((item, index) => {
                      const userAnswer = selectedAnswers[item.id] ?? "";
                      const correct = userAnswer === item.correctAnswer;

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-[22px_1fr] gap-3"
                        >
                          <div
                            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
                              correct
                                ? "border-green-500 text-green-500"
                                : "border-red-500 text-red-500"
                            }`}
                          >
                            {correct ? "✓" : "×"}
                          </div>

                          <div>
                            <p className="text-[12px] leading-5 text-[#6b7280]">
                              {index + 1}. {item.question}
                            </p>

                            <p className="text-[12px] leading-5">
                              Your answer:{" "}
                              <span className="font-medium">{userAnswer}</span>
                            </p>

                            {!correct && (
                              <p className="text-[12px] leading-5 text-green-500">
                                Correct: {item.correctAnswer}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-7 grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={restartQuiz}
                      className="rounded-md border border-[#dedede] bg-white px-4 py-2.5 text-[13px] font-medium"
                    >
                      ↻&nbsp; Restart quiz
                    </button>

                    <button
                      type="button"
                      onClick={saveAndLeave}
                      className="rounded-md bg-[#171717] px-4 py-2.5 text-[13px] font-medium text-white"
                    >
                      ♧&nbsp; Save and leave
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {showContentModal && currentArticle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          onMouseDown={() => setShowContentModal(false)}
        >
          <div
            className="max-h-[78vh] w-full max-w-[620px] overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-[22px] font-semibold">
                {currentArticle.title}
              </h2>

              <button
                type="button"
                onClick={() => setShowContentModal(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#dedede] text-lg"
                aria-label="Close content"
              >
                ×
              </button>
            </div>

            <p className="mt-5 whitespace-pre-line text-[14px] leading-[20px] text-[#202020]">
              {currentArticle.content}
            </p>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[430px] rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-[21px] font-semibold">Are you sure?</h2>

            <p className="mt-2 text-[13px] text-red-500">
              If you press &apos;Cancel&apos;, this quiz will restart from the
              beginning.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-md bg-[#171717] px-4 py-2.5 text-[13px] font-medium text-white"
              >
                Go back
              </button>

              <button
                type="button"
                onClick={cancelQuiz}
                className="rounded-md border border-[#dedede] bg-white px-4 py-2.5 text-[13px] font-medium"
              >
                Cancel quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
