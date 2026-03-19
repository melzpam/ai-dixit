import pLimit from "p-limit";

const MAX_RETRIES = 2;
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "imagen-4.0-fast-generate-001";

export class ImageGenerator {
  private readonly apiKey: string;
  private readonly dailyCapImages: number;
  private readonly limit: ReturnType<typeof pLimit>;

  private generationCount = 0;
  private currentDay: string;

  constructor(config: { apiKey: string; dailyCapImages: number }) {
    this.apiKey = config.apiKey;
    this.dailyCapImages = config.dailyCapImages;
    this.currentDay = this.today();
    this.limit = pLimit(5);
  }

  /** Generate image from prompt. Returns base64 JPEG or null on failure. */
  async generate(prompt: string): Promise<string | null> {
    this.resetIfNewDay();

    if (this.isCapReached) {
      console.log(
        JSON.stringify({
          event: "image_generation_cap_reached",
          dailyCount: this.generationCount,
          dailyCap: this.dailyCapImages,
          prompt: prompt.slice(0, 100),
        })
      );
      return null;
    }

    const styledPrompt = `Dreamy surreal illustration in the style of Dixit board game cards: ${prompt}. Mysterious, poetic, open to interpretation.`;
    return this.limit(() => this.generateWithRetry(styledPrompt));
  }

  /** Current daily generation count */
  get todayGenerations(): number {
    this.resetIfNewDay();
    return this.generationCount;
  }

  /** Whether daily cap has been reached */
  get isCapReached(): boolean {
    this.resetIfNewDay();
    return this.generationCount >= this.dailyCapImages;
  }

  private async generateWithRetry(prompt: string): Promise<string | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const startMs = Date.now();

      console.log(
        JSON.stringify({
          event: "image_generation_start",
          attempt: attempt + 1,
          maxAttempts: MAX_RETRIES + 1,
          prompt: prompt.slice(0, 100),
        })
      );

      try {
        const url = `${GEMINI_API_BASE}/models/${MODEL}:predict?key=${this.apiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "3:4",
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Imagen API ${response.status}: ${errorBody.slice(0, 200)}`
          );
        }

        const data = await response.json();
        const predictions = data?.predictions;

        if (!predictions || predictions.length === 0) {
          throw new Error("No predictions in Imagen response");
        }

        const base64 = predictions[0]?.bytesBase64Encoded as
          | string
          | undefined;

        if (!base64) {
          throw new Error("No base64 data in Imagen response");
        }

        this.generationCount++;
        const durationMs = Date.now() - startMs;

        console.log(
          JSON.stringify({
            event: "image_generation_success",
            attempt: attempt + 1,
            duration_ms: durationMs,
            prompt: prompt.slice(0, 100),
            dailyCount: this.generationCount,
          })
        );

        return base64;
      } catch (err: unknown) {
        const durationMs = Date.now() - startMs;
        const errorMessage =
          err instanceof Error ? err.message : String(err);

        console.log(
          JSON.stringify({
            event: "image_generation_failure",
            attempt: attempt + 1,
            duration_ms: durationMs,
            error: errorMessage,
            prompt: prompt.slice(0, 100),
            willRetry: attempt < MAX_RETRIES,
          })
        );

        if (attempt === MAX_RETRIES) {
          return null;
        }
      }
    }

    return null;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private resetIfNewDay(): void {
    const day = this.today();
    if (day !== this.currentDay) {
      this.currentDay = day;
      this.generationCount = 0;
    }
  }
}
