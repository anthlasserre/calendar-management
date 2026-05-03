export const metadata = {
  title: "Widget — Horaires du bureau",
  robots: { index: false },
};

export default function CompanyEmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="inline-block bg-transparent p-2">
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: "setTimeout(function(){location.reload();},120000);",
        }}
      />
    </div>
  );
}
