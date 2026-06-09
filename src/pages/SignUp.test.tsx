import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test/test-utils";
import SignUp from "./SignUp";
import { translations } from "../i18n/translations";

describe("SignUp modal", () => {
  it("renders the account-type step with all three roles", () => {
    renderWithProviders(<SignUp onClose={vi.fn()} />);
    expect(screen.getByText(translations.ru.signup.chooseType)).toBeInTheDocument();
    expect(screen.getByText(translations.ru.signup.typeUser)).toBeInTheDocument();
    expect(screen.getByText(translations.ru.signup.typeAgency)).toBeInTheDocument();
    expect(screen.getByText(translations.ru.signup.typeDev)).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const { getByText } = renderWithProviders(<SignUp onClose={onClose} />);
    getByText("✕").click();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
