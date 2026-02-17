type FooterProps = {
  variant?: "default" | "signature";
};

export default function Footer({ variant = "default" }: FooterProps) {
  const isSignature = variant === "signature";

  return (
    <footer
      className={`footer mt-10 px-6 md:px-8 ${isSignature ? "footer--signature pt-1 pb-6 md:pb-8" : "py-5 border-t"}`}
      style={{
        borderColor: isSignature ? "transparent" : "var(--nerdvana-border)"
      }}
    >
      <p
        className={`uppercase ${isSignature ? "text-center text-[0.64rem] md:text-[0.68rem] tracking-[0.16em]" : "text-center text-[0.72rem] md:text-xs tracking-[0.12em]"}`}
        style={{
          fontFamily: '"Courier New", monospace',
          color: "var(--nerdvana-text)",
          opacity: isSignature ? 0.44 : 0.62
        }}
      >
        Made with love for nerds by a nerd
      </p>
    </footer>
  );
}
