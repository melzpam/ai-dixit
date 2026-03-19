import pLimit from "p-limit";

const MAX_RETRIES = 2;
const FAL_AI_BASE = "https://fal.run/fal-ai/flux/schnell";

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
        const response = await fetch(FAL_AI_BASE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${this.apiKey}`,
          },
          body: JSON.stringify({
            prompt,
            image_size: "portrait_4_3",
            num_images: 1,
            output_format: "jpeg",
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `fal.ai API ${response.status}: ${errorBody.slice(0, 200)}`
          );
        }

        const data = await response.json();
        const images = data?.images;

        // NSFW / content filter — empty images array, don't retry
        if (!images || images.length === 0) {
          console.log(
            JSON.stringify({
              event: "image_generation_content_filtered",
              prompt: prompt.slice(0, 100),
            })
          );
          return null;
        }

        const imageUrl = images[0].url;

        // Download the image and convert to base64
        const imgResponse = await fetch(imageUrl, {
          signal: AbortSignal.timeout(10_000),
        });

        if (!imgResponse.ok) {
          throw new Error(`Image download failed: ${imgResponse.status}`);
        }

        const buffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");

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
