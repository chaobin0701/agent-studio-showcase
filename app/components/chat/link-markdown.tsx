// Adapted from Zola: retain safe links without third-party favicon requests.
export function LinkMarkdown({
  href,
  children,
  ...props
}: React.ComponentProps<"a">) {
  if (!href) return <span>{children}</span>;
  // Historical Agent answers may still contain links to removed Demo pages.
  const destination = /^\/demos\/contoso-outdoor\/products\/\d+(?:[?#].*)?$/u.test(href)
    ? "/projects/contoso-outdoor#catalog"
    : href === "/demos/contoso-outdoor"
      ? "/projects/contoso-outdoor"
      : href === "/demos/robot-assistant"
        ? "/projects/robot-lab"
        : href;
  return (
    <a
      {...props}
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-3"
    >
      {children}
    </a>
  );
}
