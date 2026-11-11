# Plantilla bancaria — diseño negro y azul

Panel bancario en español, adaptado a celular y escritorio, con tarjeta negra y datos azules, saldos, cuentas, movimientos y gráfica de gastos.

## Alcance

Es una plantilla visual editable, no un sistema bancario operativo. Los nombres, saldos, números de tarjeta, movimientos y teléfono son ejemplos ficticios. Los botones y enlaces son de muestra: no realizan pagos ni transferencias. No incluye inicio de sesión ni servicios bancarios conectados.

## Abrir en tu equipo

Necesitas acceso a internet y Node.js 22.12 o superior con npm, o una versión reciente de Bun.

1. Descomprime el ZIP.
2. Abre una terminal dentro de la carpeta `plantilla-bancaria`.
3. Instala las dependencias y abre la plantilla:

```sh
npm install
npm run dev
```

Abre la dirección local que aparezca en la terminal. No abras un archivo directamente con doble clic: esta plantilla necesita su servidor de desarrollo.

Con Bun, puedes usar el archivo de versiones incluido:

```sh
bun install --frozen-lockfile
bun run dev
```

La instalación descarga las bibliotecas necesarias; no están incluidas en el ZIP.

## Personalizar el diseño

- `src/routes/index.tsx`: distribución del panel, textos y datos de ejemplo.
- `src/styles.css`: colores, tipografía y estilos; la tarjeta usa `--payment-card` y `--payment-data`.
- `src/routes/__root.tsx`: fuentes, estructura compartida y título general.
- `src/components/ui/`: controles reutilizables.
- `public/`: icono y archivos públicos.

Las fuentes Manrope y Fraunces se cargan desde Google Fonts; sin internet se utilizan las fuentes de respaldo.

## Comandos adicionales

```sh
npm run test
npm run build
```

La configuración de producción incluida apunta a Cloudflare mediante Nitro. Publicar en un alojamiento diferente puede requerir adaptar esa configuración; no es una exportación HTML estática.

## Contenido del paquete

Incluye el código fuente, los estilos, los controles y la configuración del proyecto original. No incluye credenciales, archivos internos de Lovable, historial Git, dependencias instaladas ni resultados generados. El árbol de rutas se genera automáticamente al ejecutar el proyecto.

Tecnologías: React 19, TanStack Start, TypeScript y Tailwind CSS 4.
