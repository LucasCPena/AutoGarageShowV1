import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
};

export default function Container({
  children,
  className,
  maxWidthClass = "max-w-6xl"
}: ContainerProps) {
  return (
    <div className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}
