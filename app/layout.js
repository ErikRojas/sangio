import "./globals.css";

export const metadata = {
  title: "Zangyo · Proyectos",
  description: "Sistema de manejo de proyectos para clientes y equipo Zangyo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
