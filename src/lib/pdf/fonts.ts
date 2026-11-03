import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  try {
    // Register high quality open-source fonts for react-pdf
    Font.register({
      family: "Inter",
      fonts: [
        { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff", fontWeight: "normal" },
        { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff", fontWeight: "bold" },
      ],
    });

    Font.register({
      family: "Roboto",
      fonts: [
        { src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff", fontWeight: "normal" },
        { src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff", fontWeight: "bold" },
      ],
    });

    Font.register({
      family: "Lora",
      fonts: [
        { src: "https://fonts.gstatic.com/s/lora/v32/0QI6MX1D_JOeGQbT5vk.woff", fontWeight: "normal" },
        { src: "https://fonts.gstatic.com/s/lora/v32/0QI8MX1D_JOeGQbdCGW_7i4.woff", fontWeight: "bold" },
      ],
    });

    registered = true;
  } catch (err) {
    console.warn("Could not register external PDF fonts, falling back to built-ins:", err);
  }
}

export function getPdfFontFamily(fontId: string): string {
  switch (fontId) {
    case "inter":
      return "Helvetica"; // Built-in ultra-reliable fallback matching Inter proportions
    case "roboto":
    case "lato":
      return "Helvetica";
    case "merriweather":
    case "lora":
    case "eb-garamond":
      return "Times-Roman";
    case "plex-mono":
      return "Courier";
    default:
      return "Helvetica";
  }
}
