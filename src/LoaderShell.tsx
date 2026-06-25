import type { LoaderProps } from "./types";

interface LoaderShellProps extends LoaderProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function LoaderShell({
  canvasRef,
  label,
  className,
  shape = "circle",
  backdrop = "transparent",
  size = 220,
}: LoaderShellProps) {
  const markClass =
    backdrop === "mark" ? `loader-mark loader-mark--${shape}` : "loader-canvas";

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div className={markClass} style={{ width: size, height: size }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: size, height: size }}
          width={size}
          height={size}
          aria-hidden
        />
      </div>
      {label && (
        <p
          style={{
            margin: 0,
            fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
            fontSize: 11,
            fontWeight: 500,
            color: "#71717a",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
