import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "../test/test-utils";

// Leaflet doesn't work in jsdom — stub the map.
vi.mock("../components/MapComponent", () => ({
  default: () => <div data-testid="map-stub" />,
}));

// Avoid real network: getListings resolves to an empty catalog.
const getListings = vi.fn();
vi.mock("../api/dashboard", () => ({
  getListings: (...args: unknown[]) => getListings(...args),
}));

import Catalog from "./Catalog";

describe("Catalog", () => {
  beforeEach(() => {
    getListings.mockReset();
    getListings.mockResolvedValue([]);
  });

  it("renders the filter controls and fetches listings on mount", async () => {
    renderWithProviders(<Catalog />);
    expect(screen.getByText("Все типы")).toBeInTheDocument();
    expect(screen.getByTestId("map-stub")).toBeInTheDocument();
    expect(getListings).toHaveBeenCalled();
  });
});
