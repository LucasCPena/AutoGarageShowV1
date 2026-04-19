"use client";

import { useCallback, useEffect, useState } from "react";

import { listingImageAlt } from "@/lib/image-alt";

type Props = {
  images: string[];
  title?: string;
};

export default function ListingGallery({ images, title }: Props) {
  const imgList = images?.length ? images : ["/placeholders/car.svg"];
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  const move = useCallback(
    (direction: -1 | 1) => {
      setIndex((current) => {
        const next = current + direction;
        if (next < 0) return imgList.length - 1;
        if (next >= imgList.length) return 0;
        return next;
      });
    },
    [imgList.length]
  );

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move, open]);

  const activeImage = imgList[index] || "/placeholders/car.svg";

  return (
    <div className="grid self-start content-start gap-0.5">
      <div className="relative mx-auto w-full self-start max-w-[640px] overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50 p-2 shadow-sm sm:p-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full"
          aria-label="Ampliar galeria do veículo"
        >
          <img
            src={activeImage}
            alt={listingImageAlt(title, index + 1)}
            className="mx-auto block h-auto w-auto max-w-full rounded-2xl object-contain max-h-[22vh] sm:max-h-[26vh] lg:max-h-[30vh]"
          />
        </button>

        {imgList.length > 1 ? (
          <>
            <div className="absolute inset-y-0 left-3 flex items-center">
              <button
                type="button"
                onClick={() => move(-1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-base font-bold text-slate-700 shadow-sm hover:bg-white"
                aria-label="Imagem anterior"
              >
                {"<"}
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                type="button"
                onClick={() => move(1)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-base font-bold text-slate-700 shadow-sm hover:bg-white"
                aria-label="Próxima imagem"
              >
                {">"}
              </button>
            </div>
          </>
        ) : null}

        <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          Foto {index + 1} de {imgList.length}
        </div>
      </div>

      {imgList.length > 1 ? (
        <div className="flex h-14 w-fit self-start max-w-full items-start gap-1.5 overflow-x-auto pb-0 sm:h-16">
          {imgList.map((src, imageIndex) => {
            const isActive = imageIndex === index;
            return (
              <button
                key={`${src}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`h-full shrink-0 overflow-hidden rounded-xl border bg-white ${
                  isActive ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"
                }`}
              >
                <img
                  src={src}
                  alt={listingImageAlt(title, imageIndex + 1)}
                  className="block h-full w-[92px] object-cover sm:w-[108px]"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                {title || "Galeria do veículo"}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="grid items-center gap-3 lg:grid-cols-[56px_minmax(0,1fr)_56px]">
              <button
                type="button"
                onClick={() => move(-1)}
                className="hidden h-12 rounded-full border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50 lg:block"
                aria-label="Imagem anterior"
              >
                {"<"}
              </button>

              <div className="flex justify-center">
                <img
                  src={activeImage}
                  alt={listingImageAlt(title, index + 1)}
                  className="block max-h-[78vh] w-auto max-w-full rounded-2xl object-contain"
                />
              </div>

              <button
                type="button"
                onClick={() => move(1)}
                className="hidden h-12 rounded-full border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50 lg:block"
                aria-label="Próxima imagem"
              >
                {">"}
              </button>
            </div>

            {imgList.length > 1 ? (
              <div className="mt-4 flex items-start gap-2 overflow-x-auto pb-1">
                {imgList.map((src, imageIndex) => (
                  <button
                    key={`${src}-${imageIndex}-modal`}
                    type="button"
                    onClick={() => setIndex(imageIndex)}
                    className={`shrink-0 overflow-hidden rounded-xl border ${
                      imageIndex === index
                        ? "border-brand-500 ring-2 ring-brand-200"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={src}
                      alt={listingImageAlt(title, imageIndex + 1)}
                      className="block h-12 w-[78px] object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
