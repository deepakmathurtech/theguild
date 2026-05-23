export default function AmbientGlow() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,164,75,0.12),transparent_55%)]" />

      <div className="absolute top-0 h-72 w-full bg-gradient-to-b from-yellow-900/10 to-transparent" />
    </>
  );
}