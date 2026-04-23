import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaOptionsType } from "embla-carousel";
import { cn } from "../../../../lib/cn";

export type MotionCarouselProps<TSlide> = {
  slides: TSlide[];
  options?: EmblaOptionsType;
  renderSlide: (slide: TSlide, index: number) => ReactNode;
  className?: string;
};

export function MotionCarousel<TSlide>({
  slides,
  options,
  renderSlide,
  className,
}: MotionCarouselProps<TSlide>) {
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  const totalSlides = slides.length;
  const maxVisibleDots = 12;
  const dotWindowStart = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(maxVisibleDots / 2),
      Math.max(0, totalSlides - maxVisibleDots),
    ),
  );
  const visibleDots = slides
    .map((_, index) => index)
    .slice(dotWindowStart, dotWindowStart + maxVisibleDots);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-3 flex touch-pan-y">
          {slides.map((slide, index) => (
            <div
              className="min-w-0 shrink-0 basis-full pl-3"
              key={index}
            >
              {renderSlide(slide, index)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {selectedIndex + 1}/{totalSlides}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleDots.map((index) => (
            <button
              aria-label={`Ir a slide ${index + 1}`}
              className={cn(
                "h-2 rounded-full transition",
                selectedIndex === index
                  ? "w-5 bg-primary"
                  : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/50",
              )}
              key={`dot-${index}`}
              onClick={() => emblaApi?.scrollTo(index)}
              type="button"
            />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            aria-label="Slide anterior"
            className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            onClick={scrollPrev}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Slide siguiente"
            className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
            onClick={scrollNext}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
