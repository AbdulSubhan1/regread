import { BUTTON } from "./styles";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" };

export function Button({ variant = "primary", className = "", type = "button", ...rest }: Props) {
  return <button data-ui="Button" type={type} className={`${BUTTON.base} ${BUTTON[variant]} ${className}`} {...rest} />;
}
