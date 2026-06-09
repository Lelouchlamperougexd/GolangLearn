import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test/test-utils";
import Home from "./Home";
import { translations } from "../i18n/translations";

describe("Home (landing)", () => {
  it("renders the hero headline and primary CTA in the default (ru) language", () => {
    renderWithProviders(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(translations.ru.hero.line1);
    expect(heading).toHaveTextContent(translations.ru.hero.line2);
    expect(
      screen.getAllByText(translations.ru.hero.catalogBtn).length
    ).toBeGreaterThan(0);
  });

  it("renders the language switcher and theme toggle", () => {
    renderWithProviders(<Home />);
    expect(screen.getByText("KZ")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByTitle("Theme")).toBeInTheDocument();
  });
});
