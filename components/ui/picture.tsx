import Image from "next/image";

type Props = { src: string; alt: string; width: number; height: number; className?: string; priority?: boolean };

/** Card images. Blob previews of the visitor's own photo skip the optimiser (they never leave the browser). */
export function Picture({ src, alt, width, height, className = "", priority }: Props) {
  return (
    <Image
      data-ui="Picture"
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      unoptimized={src.startsWith("blob:")}
      className={`h-auto w-full ${className}`}
    />
  );
}
