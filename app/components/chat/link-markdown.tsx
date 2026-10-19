// Adapted from Zola: retain safe links without third-party favicon requests.
export function LinkMarkdown({
  href,
  children,
  ...props
}: React.ComponentProps<"a">) {
  if (!href) return <span>{children}</span>;
  return (
    <a
      {...props}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-3"
    >
      {children}
    </a>
  );
}
