import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { WelcomePage } from "./WelcomePage";

afterEach(cleanup);

describe("WelcomePage", () => {
  // AC #8: Welcome heading renders
  it("renders welcome heading", () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole("heading", { name: /welcome to hexalith\.frontshell/i }),
    ).toBeTruthy();
  });

  it("renders a description paragraph", () => {
    render(<WelcomePage />);
    // Should have some descriptive text
    const main = screen.getByRole("heading", {
      name: /welcome to hexalith\.frontshell/i,
    });
    expect(main).toBeTruthy();
  });
});
