import "./globals.css";

export const metadata = {
  title: "Estudio · Proyectos",
  description: "Sistema de manejo de proyectos para clientes y equipo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
