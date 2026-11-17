import { Picture } from "./picture";

type Props = { image: string; alt: string; label: string; onClick: () => void; disabled?: boolean };

/** A picture you can pick, e.g. a sample card. */
export function Tile({ image, alt, label, onClick, disabled }: Props) {
  return (
    <button
      data-ui="Tile"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group block w-full overflow-hidden rounded-box border border-line bg-paper text-start transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
    >
      <Picture src={image} alt={alt} width={480} height={300} />
      <span className="block px-2 py-1.5 text-sm font-semibold group-hover:text-brand">{label}</span>
    </button>
  );
}
