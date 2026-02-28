"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

export default function ZoomableImage({
  src,
  alt,
  className,
  width = 1200,
  height = 800,
  sizes,
  priority
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full overflow-hidden"
        aria-label={`Ampliar imagem: ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          sizes={sizes}
          priority={priority}
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative h-[min(85vh,900px)] w-[min(95vw,1400px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white"
            >
              Fechar
            </button>
            <Image
              src={src}
              alt={alt}
              fill
              className="rounded-lg object-contain"
              sizes="95vw"
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
