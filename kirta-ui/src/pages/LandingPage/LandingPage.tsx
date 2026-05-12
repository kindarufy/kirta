import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Code2,
  Gauge,
  Radar,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-lg font-semibold tracking-wide text-white">KIRTA</div>
              <div className="text-xs text-slate-400">AI Security Platform</div>
            </div>
          </div>

          <Button asChild size="sm">
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
              <Link to="/scans">
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
          <p className="text-slate-300 md:whitespace-nowrap">
            KIRTA объединяет результаты проверок и превращает их в объяснимый security-отчет с понятными приоритетами для команды
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
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div className="landing-card p-6">
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <BrainCircuit className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-white">Объяснение от AI</h2>
            </div>
            <p className="text-sm text-slate-300">
              AI анализирует структурированный контекст проекта и формирует объяснение, где
              риск подтверждается кодом и реальным сценарием эксплуатации
            </p>
          </div>

          <div className="landing-card p-4">
            <div className="grid gap-3 text-xs text-slate-300 md:grid-cols-2">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  JSON Context
                </p>
                <pre className="landing-json text-cyan-100">
{`{
  "finding": "CVE-2020-14343",
  "library": "pyyaml@5.1",
  "severity": "CRITICAL",
  "call_path": ["api.entrypoint -> handlers.import_config -> yaml.load"],
  "code_line": "upload.py:42"
}`}
                </pre>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-3">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  JSON Verdict
                </p>
                <pre className="landing-json text-emerald-100">
{`{
  "exploitability": "EXPLOITABLE",
  "risk_level": "HIGH",
  "reason": "unsafe yaml.load path",
  "recommendation": "upgrade to fixed version"
}`}
                </pre>
              </div>
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
                <Link to="/scans">
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
