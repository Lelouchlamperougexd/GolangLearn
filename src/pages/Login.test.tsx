import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test/test-utils";
import Container from "./Login";

describe("Login modal", () => {
  it("renders email + password fields and the forgot-password link", () => {
    renderWithProviders(<Container onClose={vi.fn()} />);
    expect(screen.getByText(/Забыли пароль/i)).toBeInTheDocument();
    // Email + password inputs are present.
    expect(
      document.querySelector('input[type="email"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('input[type="password"]')
    ).toBeInTheDocument();
  });
});
