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
    <>
      <style>{`html,body{background:transparent !important;background-image:none !important;}`}</style>
      <div className="bg-transparent p-2">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: "setTimeout(function(){location.reload();},120000);",
          }}
        />
      </div>
    </>
  );
}
