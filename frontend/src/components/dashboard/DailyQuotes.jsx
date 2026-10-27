
import { useEffect, useState } from "react";
import { Quote } from "lucide-react";

const API_URL = "https://dumbapis.com/daily/quote";
const CACHE_KEY = "ascend-daily-quote";

export default function DailyQuote() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      try {
        // Reuse today's quote when it is already cached.
        const cached = localStorage.getItem(CACHE_KEY);

        if (cached) {
          const parsed = JSON.parse(cached);

          if (
            parsed.date === new Date().toISOString().slice(0, 10) &&
            parsed.quote &&
            parsed.author
          ) {
            setQuote(parsed);
            setLoading(false);
            return;
          }
        }

        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error("Could not fetch today's quote.");
        }

        const data = await response.json();

        if (!data.quote || !data.author || !data.date) {
          throw new Error("Invalid quote response.");
        }

        if (!cancelled) {
          setQuote(data);
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuote();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="daily-quote-card">
      <div className="daily-quote-icon">
        <Quote size={22} />
      </div>

      <div className="daily-quote-content">
        <span className="daily-quote-label">
          DAILY INSPIRATION
        </span>

        <h2>Today's motivation</h2>

        {loading ? (
          <p>Finding a little inspiration...</p>
        ) : quote ? (
          <>
            <blockquote>“{quote.quote}”</blockquote>
            <p className="daily-quote-author">
              — {quote.author}
            </p>
          </>
        ) : (
          <p>
            Every small step counts. Keep showing up for yourself today.
          </p>
        )}

        {error && (
          <span className="daily-quote-note">
            Showing a backup message because the quote service is unavailable.
          </span>
        )}
      </div>
    </section>
  );
}
