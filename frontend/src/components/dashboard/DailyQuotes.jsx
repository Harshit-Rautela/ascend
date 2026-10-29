
import { useEffect, useState } from "react";
import { Quote, Sparkles } from "lucide-react";
import "./dashboard.css";


const API_URL = "http://localhost:5000/api/quotes/daily";
const CACHE_KEY = "ascend-daily-quote";

// Images are served from Vite's public directory.
const BACKGROUNDS = {
  discipline: "/images/quotes/discipline.png",
  resilience: "/images/quotes/resilience.png",
  strength: "/images/quotes/strength.png",
  mindfulness: "/images/quotes/mindfulness.png",
  // growth: "/images/quotes/growth.jpg",
};

const FALLBACK_QUOTE = {
  quote:
    "Small disciplines repeated with consistency lead to remarkable results.",
  author: "Ascend",
  theme: "discipline",
};

function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function inferTheme(quote) {
  // Prefer an explicit theme returned by the API.
  const explicitTheme = quote.theme?.toLowerCase().trim();

  if (explicitTheme && BACKGROUNDS[explicitTheme]) {
    return explicitTheme;
  }

  // Temporary fallback until our AI backend supplies a theme.
  const text = quote.quote.toLowerCase();

  if (/resilien|adversity|courage|overcome|persever/.test(text)) {
    return "resilience";
  }

  if (/strength|train|fitness|power|strong/.test(text)) {
    return "strength";
  }

  if (/mindful|peace|patience|balance|calm/.test(text)) {
    return "mindfulness";
  }

  if (/growth|learn|progress|improve|potential/.test(text)) {
    return "growth";
  }

  return "discipline";
}

function normalizeQuote(data) {
  if (
    typeof data?.quote !== "string" ||
    typeof data?.author !== "string" ||
    !data.quote.trim() ||
    !data.author.trim()
  ) {
    throw new Error("Invalid quote response.");
  }

  return {
    quote: data.quote.trim(),
    author: data.author.trim(),
    date: getToday(),
    theme: inferTheme(data),
    sourceUrl: data.sourceUrl || data.source_url || null,
  };
}

export default function DailyQuotes() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuote() {
      try {
        const cached = localStorage.getItem(CACHE_KEY);

        if (cached) {
          try {
            const parsed = JSON.parse(cached);

            if (
              parsed.date === getToday() &&
              typeof parsed.quote === "string" &&
              typeof parsed.author === "string"
            ) {
              const normalized = normalizeQuote(parsed);

              setQuote(normalized);
              setLoading(false);
              return;
            }
          } catch {
            localStorage.removeItem(CACHE_KEY);
          }
        }

        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not fetch today's quote.");
        }

        const data = await response.json();

        if (controller.signal.aborted) return;

        const normalized = normalizeQuote(data);

        setQuote(normalized);
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      } catch (error) {
        if (error.name === "AbortError") return;

        if (!controller.signal.aborted) {
          const fallback = {
            ...FALLBACK_QUOTE,
            date: getToday(),
          };

          setQuote(fallback);
          setUsingFallback(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadQuote();

    return () => controller.abort();
  }, []);

  const theme = quote ? inferTheme(quote) : "discipline";
  const backgroundImage = BACKGROUNDS[theme];

  return (
    <section
      className={`daily-quote-card ${loading ? "is-loading" : ""}`}
      style={{
        "--quote-background": `url("${backgroundImage}")`,
      }}
      aria-label="Daily inspiration"
    >
      <div className="daily-quote-overlay" />

      <div className="daily-quote-top">
        <div className="daily-quote-brand">
          <span className="daily-quote-icon">
            <Quote size={19} />
          </span>

          <span className="daily-quote-label">
            DAILY INSPIRATION
          </span>
        </div>

        <span className="daily-quote-badge">
          <Sparkles size={13} />
          ASCEND MINDSET
        </span>
      </div>

      <div className="daily-quote-content">
        <span className="daily-quote-overline">
          A THOUGHT TO CARRY WITH YOU
        </span>

        <h2>Today's motivation.</h2>

        {loading ? (
          <p className="daily-quote-loading">
            Finding your daily inspiration...
          </p>
        ) : (
          <>
            <blockquote>
              <span className="daily-quote-mark" aria-hidden="true">
                “
              </span>
              {quote.quote}
              <span className="daily-quote-mark" aria-hidden="true">
                ”
              </span>
            </blockquote>

            <div className="daily-quote-attribution">
              <span className="daily-quote-author-line" />
              <div>
                <p className="daily-quote-author">{quote.author}</p>
                {quote.sourceUrl && (
                  <a
                    className="daily-quote-source"
                    href={quote.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View source
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="daily-quote-footer">
        <span>
          {usingFallback
            ? "YOUR DAILY REMINDER"
            : "GROW THROUGH WHAT YOU GO THROUGH"}
        </span>

        <span className="daily-quote-footer-mark">
          ASCEND <span>.</span>
        </span>
      </div>
    </section>
  );
}
