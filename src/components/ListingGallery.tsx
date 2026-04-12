"use client";

import { useCallback, useEffect, useState } from "react";

import Image from "next/image";

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
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full"
          aria-label="Ampliar galeria do veículo"
        >
          <Image
            src={activeImage}
            alt={listingImageAlt(title, index + 1)}
            width={1400}
            height={980}
            className="h-[340px] w-full object-contain p-4 sm:h-[400px] sm:p-6 md:h-[480px]"
            priority={index === 0}
          />
        </button>

        {imgList.length > 1 ? (
          <>
            <div className="absolute inset-y-0 left-3 flex items-center">
              <button
                type="button"
                onClick={() => move(-1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-base font-bold text-slate-700 shadow-sm hover:bg-white"
                aria-label="Imagem anterior"
              >
                {"<"}
              </button>
            </div>
            <div className="absolute inset-y-0 right-3 flex items-center">
              <button
                type="button"
                onClick={() => move(1)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-base font-bold text-slate-700 shadow-sm hover:bg-white"
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
        <div className="flex gap-3 overflow-x-auto pb-1">
          {imgList.map((src, imageIndex) => {
            const isActive = imageIndex === index;
            return (
              <button
                key={`${src}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`min-w-[104px] overflow-hidden rounded-2xl border bg-white ${
                  isActive ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"
                }`}
              >
                <Image
                  src={src}
                  alt={listingImageAlt(title, imageIndex + 1)}
                  width={240}
                  height={160}
                  className="h-20 w-[104px] object-cover"
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

              <img
                src={activeImage}
                alt={listingImageAlt(title, index + 1)}
                className="max-h-[78vh] w-full rounded-2xl object-contain"
              />

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
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {imgList.map((src, imageIndex) => (
                  <button
                    key={`${src}-${imageIndex}-modal`}
                    type="button"
                    onClick={() => setIndex(imageIndex)}
                    className={`overflow-hidden rounded-xl border ${
                      imageIndex === index
                        ? "border-brand-500 ring-2 ring-brand-200"
                        : "border-slate-200"
                    }`}
                  >
                    <img
                      src={src}
                      alt={listingImageAlt(title, imageIndex + 1)}
                      className="h-16 w-24 object-cover"
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
