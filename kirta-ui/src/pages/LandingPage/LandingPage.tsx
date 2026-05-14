import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  FileCode2,
  Gauge,
  Hash,
  Radar,
  ShieldAlert,
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import "./landing.css";

const metrics = [
  {
    title: "Снижение шума",
    value: "до 45%",
    hint: "меньше ложных и нерелевантных задач в очереди на исправление",
  },
  {
    title: "Скорость разбора и приоритизации",
    value: "до 2x быстрее",
    hint: "быстрее переход от обнаруженной уязвимости к решению команды",
  },
  {
    title: "Дефекты с подтверждением в коде",
    value: "80%+",
    hint: "доля обнаруженных уязвимостей, подтверждённых в коде",
  },
  {
    title: "Время на решение",
    value: "< 30 мин",
    hint: "скорость принятия решения по реальному риску",
  },
];

const audience = [
  {
    title: "Security команда",
    text: "Получает приоритизированный список уязвимостей с объяснением, какие из них реально достижимы и должны быть устранены в первую очередь",
    icon: ShieldAlert,
  },
  {
    title: "Development команда",
    text: "Получает понятный путь от уязвимой зависимости до конкретного участка кода и рекомендации по исправлению",
    icon: Code2,
  },
  {
    title: "Business & Product команда",
    text: "Получает понятный план исправлений, основанный на реальном риске для продукта, а не только на списке известных уязвимостей",
    icon: Gauge,
  },
];

const compareRows = [
  {
    classic: "Показывает список известных уязвимостей",
    kirta: "Показывает, какие уязвимости реально достижимы в коде",
  },
  {
    classic: "Сортирует по формальной критичности",
    kirta: "Приоритизирует по реальному риску и доказательствам",
  },
  {
    classic: "Требует ручной проверки каждого результата сканирования",
    kirta: "Формирует объяснимый отчёт с причиной, участком кода и следующим шагом",
  },
];

const callMapPreviewFiles = [
  { file: "app.py", path: "extremely-vulnerable-flask-app-main", calls: 5 },
  { file: "account.py", path: "extremely-vulnerable-flask-app-main", calls: 15 },
  { file: "home.py", path: "extremely-vulnerable-flask-app-main", calls: 2 },
  { file: "login.py", path: "extremely-vulnerable-flask-app-main", calls: 6 },
  { file: "notes.py", path: "extremely-vulnerable-flask-app-main", calls: 6 },
  { file: "registration_codes.py", path: "extremely-vulnerable-flask-app-main", calls: 7 },
  { file: "signup.py", path: "extremely-vulnerable-flask-app-main", calls: 9 },
];

const sourcePreviewCode = `from flask import request
from flask import jsonify
import yaml

def import_config():
    payload = request.data
    # уязвимый метод библиотеки
    data = yaml.load(payload, Loader=None)
    return data

def process_request():
    if not request.data:
        return jsonify({"status": "error"}), 400
    parsed = import_config()
    return jsonify({"status": "processed", "result": parsed}), 200`;

export function LandingPage() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const hadDark = root.classList.contains("dark");

    root.classList.add("dark");
    body.classList.add("landing-scroll");

    return () => {
      body.classList.remove("landing-scroll");
      if (!hadDark) {
        root.classList.remove("dark");
      }
    };
  }, []);

  return (
    <div className="landing-root min-h-screen">
      <div className="landing-grid" />
      <span className="landing-glow -left-20 top-20 h-72 w-72 bg-cyan-500/35" />
      <span className="landing-glow -right-16 top-40 h-72 w-72 bg-blue-500/30 [animation-delay:1.4s]" />

      <header className="relative z-20 border-b border-slate-800/70 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Logo
            size="xl"
            src="/kirta-logo-landing.png"
            className="-ml-11 sm:-ml-12"
            imageClassName="object-contain object-top"
          />

          <Button asChild size="pill" className="h-10 px-5 text-sm font-semibold">
            <Link to="/login">Войти</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div className="space-y-7">
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
                AI-платформа для анализа уязвимостей исходного кода
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                KIRTA помогает быстро понять, какие уязвимости действительно важны для продукта,
                оценить реальный риск и принять решение об исправлении
              </p>
            </div>

            <Button asChild size="pill" className="shadow-lg shadow-blue-600/30">
              <Link to="/scans" state={{ fromLanding: true }}>
                Попробовать KIRTA
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="landing-card p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="landing-flow-text text-base font-semibold text-white sm:text-lg">
                #2 CVE-2020-14343 (pyyaml@5.1)
              </h2>
              <span className="inline-flex shrink-0 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                Карта вызовов
              </span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-rose-400/35 bg-rose-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-300">
                CRITICAL
              </span>
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                EXPLOITABLE
              </span>
            </div>

            <h3 className="mb-4 text-base font-semibold text-slate-100 sm:text-lg">
              Improper Input Validation in PyYAML
            </h3>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/75 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Признаки эксплуатируемости
                </div>
                <p className="landing-flow-text text-sm leading-relaxed text-slate-200">
                  В коде используется yaml.load(request.data, Loader=None) - вызов без указания
                  безопасной загрузки, что позволяет выполнить произвольный код при обработке
                  пользовательских данных. Это напрямую соответствует уязвимости CVE-2020-14343.
                </p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-900/75 p-3">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Исправление
                </div>
                <span className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  Есть версия с исправлением
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="landing-section-title">
            Реальные уязвимости тонут в большом количестве false-positive
          </h2>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="landing-card p-6">
              <h3 className="mb-3 text-lg font-semibold text-rose-200">До KIRTA</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                Сканеры находят десятки и сотни дефектов, но не объясняют, достижимы ли они в
                реальном коде и что нужно исправлять первым
              </p>
            </div>
            <div className="landing-card p-6">
              <h3 className="mb-3 text-lg font-semibold text-emerald-200">После KIRTA</h3>
              <p className="text-sm leading-relaxed text-slate-300">
                KIRTA показывает доказательство эксплуатируемости, карту вызовов и приоритет
                исправления, чтобы команда фокусировалась на реальном риске
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="landing-section-title">
            AI-анализ поверх результатов классических сканеров безопасности
          </h2>
          <p className="text-slate-300">
            KIRTA объединяет результаты классических security-проверок, сопоставляет их с контекстом исходного кода и формирует объяснимый security-отчет,
            который помогает команде видеть реальные приоритеты,
            быстрее оценивать риск и принимать обоснованные решения по исправлению
          </p>

          <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[minmax(0,540px)_auto_180px]">
            <div className="rounded-xl border border-slate-700/65 bg-slate-900/70 p-4">
              <p className="text-center text-[11px] uppercase tracking-[0.12em] text-slate-400">
                Классические сканеры
              </p>
              <div className="mt-3 flex items-center justify-center gap-5 text-base font-semibold text-slate-200 md:text-lg">
                <span>SAST</span>
                <span>DAST</span>
                <span>SCA</span>
              </div>
            </div>

            <div className="flex items-center justify-center text-3xl font-semibold text-slate-400 md:text-4xl">
              +
            </div>

            <div className="flex items-center justify-center rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 md:px-5 md:py-4">
              <p className="text-center text-base font-semibold uppercase tracking-[0.12em] text-cyan-200">
                AI
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Что такое карта вызовов?
            </h3>
            <p className="text-slate-300">
              Карта вызовов библиотеки показывает где и какой метод библиотеки вызывается в
              исходном коде приложения. Это позволяет командам более точно определить релевантность
              дефекта безопасности, а AI-анализу более точно определить эксплуатируемость дефекта
            </p>
          </div>

          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="landing-card h-full overflow-hidden">
              <div className="border-b border-slate-700/70 bg-slate-900/80 p-4 sm:p-5">
                <h3 className="font-mono text-2xl text-slate-100 sm:text-3xl">
                  Карта вызовов: flask <span className="text-slate-400">@3.1.1</span>
                </h3>
                <p className="mt-2 text-sm text-slate-400 sm:text-base">
                  Файлы и вызовы, связанные с библиотекой в этом сканировании. Нажмите файл, чтобы
                  открыть исходник
                </p>
              </div>

              <div className="p-3 sm:p-4">
                <div className="space-y-3 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center gap-2 text-base text-slate-200 sm:text-lg">
                    <Hash className="h-5 w-5 text-slate-400" />
                    <span className="text-slate-400">Библиотека:</span>
                    <span className="font-mono font-semibold text-slate-100">
                      flask <span className="text-slate-400">@3.1.1</span>
                    </span>
                  </div>

                  <div
                    className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 sm:p-4"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/25 via-transparent to-slate-950/30" />
                    <div className="relative grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {callMapPreviewFiles.map((item) => (
                        <div
                          key={item.file}
                          className="flex min-h-[96px] w-full flex-col rounded-2xl border border-slate-600/80 bg-slate-900/90 p-3 text-left shadow-lg shadow-black/20"
                        >
                          <span className="flex items-center gap-2">
                            <FileCode2 className="h-5 w-5 shrink-0 text-emerald-400/90" />
                            <span className="truncate font-mono text-lg font-semibold text-slate-100 sm:text-xl">
                              {item.file}
                            </span>
                          </span>
                          <span className="mt-2 truncate pl-7 font-mono text-xs leading-tight text-slate-500">
                            {item.path}
                          </span>
                          <span className="mt-3 pl-7 text-sm text-slate-400">
                            Вызовов:{" "}
                            <span className="font-semibold text-slate-100">{item.calls}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-card flex h-full min-h-[520px] flex-col overflow-hidden">
              <div className="border-b border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs font-mono text-slate-400">
                upload.py:42
              </div>
              <div className="flex-1 bg-slate-950/90 p-2 sm:p-3">
                <SyntaxHighlighter
                  language="python"
                  style={vscDarkPlus}
                  showLineNumbers
                  wrapLines
                  lineProps={(lineNumber: number) => ({
                    style:
                      lineNumber === 8
                        ? { display: "block", backgroundColor: "rgba(244,63,94,0.16)" }
                        : { display: "block" },
                  })}
                  customStyle={{
                    margin: 0,
                    background: "transparent",
                    padding: "0.75rem",
                    minHeight: "0",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    fontFamily: "JetBrains Mono, ui-monospace, monospace",
                    overflow: "hidden",
                  }}
                >
                  {sourcePreviewCode}
                </SyntaxHighlighter>
              </div>
              <div className="border-t border-slate-700/70 bg-slate-900/70 px-4 py-3 text-xs text-rose-200">
                Уязвимый вызов: <span className="font-mono">yaml.load(payload, Loader=None)</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div className="landing-card p-6">
            <div className="mb-4 flex items-center justify-center gap-2 text-cyan-300">
              <BrainCircuit className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-white">AI-анализ</h2>
            </div>
            <p className="text-left text-base leading-relaxed text-slate-300 sm:text-lg">
              AI-анализ сопоставляет результаты сканирования, карту вызовов и контекст проекта,
              определяет реальную достижимость уязвимости в коде, формирует аргументированное
              объяснение уровня риска и предлагает следующий шаг по исправлению, чтобы команда
              быстрее переходила от находки к решению
            </p>
          </div>

          <div className="landing-card p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-slate-400">#2</span>
              <span className="font-mono text-sm font-semibold text-slate-100">CVE-2020-14343 (pyyaml@5.1)</span>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-rose-400/35 bg-rose-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-300">
                CRITICAL
              </span>
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                EXPLOITABLE
              </span>
            </div>

            <div className="rounded-md border border-cyan-400/20 bg-cyan-500/5 p-3 text-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Признаки эксплуатируемости
              </div>
              <p className="text-slate-200">
                В коде используется yaml.load(request.data, Loader=None) - вызов без указания
                безопасной загрузки, что позволяет выполнить произвольный код при обработке
                пользовательских данных. Это напрямую соответствует уязвимости CVE-2020-14343.
              </p>
            </div>

            <div className="mt-3 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">
              Рекомендация: перейти на исправленную версию библиотеки
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="landing-section-title">Эффект для development и security-команд</h2>
          <p className="max-w-3xl text-slate-300">
            KIRTA помогает командам быстрее выявлять действительно важные уязвимости,
            приоритизировать работу и принимать решения на основе реального риска
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.map((metric) => (
              <div key={metric.title} className="landing-card p-5">
                <p className="text-sm text-slate-300">{metric.title}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{metric.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="landing-section-title">Кому помогает KIRTA</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {audience.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="landing-card p-5">
                  <Icon className="mb-3 h-5 w-5 text-cyan-300" />
                  <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="landing-section-title">Чем отличается KIRTA</h2>
          <div className="landing-card overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-700/60 bg-slate-900/80 px-5 py-3 text-sm font-semibold text-white">
              <div>Классический сканер</div>
              <div>KIRTA</div>
            </div>
            {compareRows.map((row) => (
              <div
                key={`${row.classic}-${row.kirta}`}
                className="grid grid-cols-2 border-b border-slate-800/70 px-5 py-4 text-sm last:border-b-0"
              >
                <div className="text-slate-300">{row.classic}</div>
                <div className="text-slate-100">{row.kirta}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6">
          <div className="landing-card overflow-hidden p-8 text-center sm:p-10">
            <div className="mx-auto mb-4 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 p-3 text-cyan-300">
              <Radar className="h-6 w-6" />
            </div>
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Получите объяснимый security-отчет по реальным рискам
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              KIRTA помогает security и development-командам говорить на одном языке: риск,
              доказательство, приоритет и следующий шаг
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="pill" className="shadow-lg shadow-blue-600/30">
                <Link to="/scans" state={{ fromLanding: true }}>
                  Попробовать KIRTA
                  <Bot className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
