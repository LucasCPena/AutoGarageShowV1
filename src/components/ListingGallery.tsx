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

  const openAt = useCallback((nextIndex: number) => {
    setIndex(nextIndex);
    setOpen(true);
  }, []);

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

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <button type="button" onClick={() => openAt(index)} className="block w-full">
            <Image
              src={imgList[index] || "/placeholders/car.svg"}
              alt={listingImageAlt(title, index + 1)}
              width={1200}
              height={800}
              className="h-[320px] w-full object-cover md:h-[420px]"
              priority={index === 0}
            />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 lg:grid-cols-1">
          {imgList.slice(0, 6).map((src, imageIndex) => {
            const isActive = imageIndex === index;
            return (
              <button
                key={`${src}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  isActive ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-200"
                }`}
              >
                <Image
                  src={src}
                  alt={listingImageAlt(title, imageIndex + 1)}
                  width={400}
                  height={300}
                  className="h-20 w-full object-cover lg:h-[92px]"
                />
              </button>
            );
          })}
        </div>
      </div>

      {imgList.length > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <div>
            Foto {index + 1} de {imgList.length}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-white"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-white"
            >
              Proxima
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-6xl rounded-3xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                {title || "Galeria do veiculo"}
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
              >
                ‹
              </button>

              <img
                src={imgList[index]}
                alt={listingImageAlt(title, index + 1)}
                className="max-h-[78vh] w-full rounded-2xl object-contain"
              />

              <button
                type="button"
                onClick={() => move(1)}
                className="hidden h-12 rounded-full border border-slate-300 text-lg font-semibold text-slate-700 hover:bg-slate-50 lg:block"
              >
                ›
              </button>
            </div>

            {imgList.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-6">
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
                      className="h-16 w-full object-cover"
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
