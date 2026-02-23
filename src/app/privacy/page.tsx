import { Dumbbell } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — TrainerGPT",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center gap-2 mb-8">
        <Dumbbell className="h-6 w-6" />
        <Link href="/" className="text-lg font-semibold tracking-tight hover:underline">
          TrainerGPT
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: February 23, 2026</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mt-0">What We Collect</h2>
          <p>
            When you sign in with Google, GitHub, or email/password, we store your email address and
            display name to identify your account. We also store the workout data you create through
            the app: exercises, sets, reps, weights, and coaching conversations.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How We Use Your Data</h2>
          <p>
            Your data is used solely to provide the TrainerGPT coaching experience — prescribing
            workouts, tracking progress, and giving personalized recommendations. We do not sell,
            share, or monetize your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Third-Party Services</h2>
          <p>TrainerGPT uses the following services to operate:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Vercel</strong> — hosting and deployment</li>
            <li><strong>Neon</strong> — PostgreSQL database</li>
            <li><strong>Upstash</strong> — Redis caching</li>
            <li><strong>Anthropic</strong> — AI model for coaching (Claude)</li>
            <li><strong>Google &amp; GitHub</strong> — OAuth authentication</li>
          </ul>
          <p>
            These services process data as necessary to provide their functionality. No additional
            data is shared beyond what is required for operation.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p>
            Your account and workout data are retained as long as your account exists. You can
            request deletion of your account and all associated data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Cookies</h2>
          <p>
            We use a session cookie to keep you signed in. No tracking or advertising cookies are
            used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            For questions about this policy or to request data deletion, reach out via the{" "}
            <a
              href="https://github.com/ryanxkh/trainergpt"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
